/**
 * Post-Deployment Analyzer - Automatic error detection and fixing
 * Analyzes logs, detects patterns, generates fixes, and auto-deploys
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';
import axios from 'axios';

interface ErrorPattern {
  name: string;
  pattern: RegExp;
  category: 'RPC' | 'DEX' | 'Slippage' | 'Transaction' | 'Network' | 'Other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixable: boolean;
  fix?: (matches: RegExpMatchArray[]) => CodeFix[];
}

interface CodeFix {
  file: string;
  search: string;
  replace: string;
  description: string;
}

interface AnalysisResult {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  detectedPatterns: Array<{
    pattern: string;
    category: string;
    count: number;
    severity: string;
    autoFixable: boolean;
  }>;
  fixes: CodeFix[];
  recommendation: string;
}

// Error pattern definitions
const ERROR_PATTERNS: ErrorPattern[] = [
  {
    name: 'RPC Rate Limiting',
    pattern: /429|rate limit|too many requests/i,
    category: 'RPC',
    severity: 'high',
    autoFixable: true,
    fix: () => [
      {
        file: 'lib/rpc-manager.ts',
        search: 'maxRetries: 3',
        replace: 'maxRetries: 5',
        description: 'Increase RPC retry attempts from 3 to 5',
      },
      {
        file: 'lib/rpc-manager.ts',
        search: 'retryDelay: 1000',
        replace: 'retryDelay: 2000',
        description: 'Increase retry delay from 1s to 2s',
      },
    ],
  },
  {
    name: 'RPC Timeout',
    pattern: /timeout|ETIMEDOUT|connection timed out/i,
    category: 'RPC',
    severity: 'high',
    autoFixable: true,
    fix: () => [
      {
        file: 'lib/rpc-manager.ts',
        search: 'timeout: 30000',
        replace: 'timeout: 60000',
        description: 'Increase RPC timeout from 30s to 60s',
      },
      {
        file: 'lib/connection-pool.ts',
        search: 'connectionTimeout: 30000',
        replace: 'connectionTimeout: 60000',
        description: 'Increase connection timeout',
      },
    ],
  },
  {
    name: 'DEX Swap Failure',
    pattern: /swap failed|slippage tolerance exceeded|insufficient liquidity/i,
    category: 'DEX',
    severity: 'medium',
    autoFixable: true,
    fix: () => [
      {
        file: 'lib/slippage-guard.ts',
        search: 'defaultSlippageBps: 50',
        replace: 'defaultSlippageBps: 100',
        description: 'Increase default slippage tolerance from 0.5% to 1%',
      },
      {
        file: 'src/strategies/flashLoanArbitrage.ts',
        search: 'maxRetries: 2',
        replace: 'maxRetries: 3',
        description: 'Increase DEX swap retry attempts',
      },
    ],
  },
  {
    name: 'Blockhash Expired',
    pattern: /blockhash not found|transaction expired/i,
    category: 'Transaction',
    severity: 'high',
    autoFixable: true,
    fix: () => [
      {
        file: 'lib/executor.ts',
        search: 'const { blockhash } = await connection.getLatestBlockhash()',
        replace: 'const { blockhash } = await connection.getLatestBlockhash("finalized")',
        description: 'Use finalized blockhash commitment for better reliability',
      },
    ],
  },
  {
    name: 'Network Connection Error',
    pattern: /ECONNRESET|ECONNREFUSED|network error|socket hang up/i,
    category: 'Network',
    severity: 'high',
    autoFixable: true,
    fix: () => [
      {
        file: 'lib/connection-pool.ts',
        search: 'poolSize: 3',
        replace: 'poolSize: 5',
        description: 'Increase connection pool size from 3 to 5',
      },
      {
        file: 'lib/retry-engine.ts',
        search: 'maxAttempts: 3',
        replace: 'maxAttempts: 5',
        description: 'Increase retry attempts for network errors',
      },
    ],
  },
  {
    name: 'Slippage Too High',
    pattern: /slippage.*exceeded|price impact too high/i,
    category: 'Slippage',
    severity: 'medium',
    autoFixable: true,
    fix: () => [
      {
        file: 'lib/slippage-guard.ts',
        search: 'maxSlippageBps: 100',
        replace: 'maxSlippageBps: 150',
        description: 'Increase max slippage from 1% to 1.5%',
      },
    ],
  },
];

/**
 * Parse log file and extract errors
 */
function parseLogFile(logPath: string): string[] {
  if (!existsSync(logPath)) {
    console.log(`Log file not found: ${logPath}`);
    return [];
  }

  const content = readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  
  // Extract error lines (lines containing 'error', 'ERROR', 'failed', 'Failed')
  const errorLines = lines.filter(line => 
    /error|ERROR|failed|Failed|exception|Exception/i.test(line)
  );

  return errorLines;
}

/**
 * Analyze errors and detect patterns
 */
function analyzeErrors(errorLines: string[]): AnalysisResult {
  const errorsByCategory: Record<string, number> = {};
  const detectedPatterns: AnalysisResult['detectedPatterns'] = [];
  const allFixes: CodeFix[] = [];
  const patternMatches = new Map<string, RegExpMatchArray[]>();

  // Analyze each error line
  for (const line of errorLines) {
    for (const pattern of ERROR_PATTERNS) {
      const match = line.match(pattern.pattern);
      if (match) {
        errorsByCategory[pattern.category] = (errorsByCategory[pattern.category] || 0) + 1;
        
        if (!patternMatches.has(pattern.name)) {
          patternMatches.set(pattern.name, []);
          detectedPatterns.push({
            pattern: pattern.name,
            category: pattern.category,
            count: 0,
            severity: pattern.severity,
            autoFixable: pattern.autoFixable,
          });
        }
        
        patternMatches.get(pattern.name)!.push(match);
      }
    }
  }

  // Update counts and generate fixes
  for (const detected of detectedPatterns) {
    const matches = patternMatches.get(detected.pattern) || [];
    detected.count = matches.length;
    
    // Generate fixes if pattern is auto-fixable and appears frequently
    const errorPattern = ERROR_PATTERNS.find(p => p.name === detected.pattern);
    if (errorPattern?.autoFixable && errorPattern.fix && detected.count >= 5) {
      const fixes = errorPattern.fix(matches);
      allFixes.push(...fixes);
    }
  }

  // Sort by count
  detectedPatterns.sort((a, b) => b.count - a.count);

  // Generate recommendation
  let recommendation = '';
  if (allFixes.length > 0) {
    recommendation = `Found ${allFixes.length} auto-fixable issues. Fixes will be applied automatically.`;
  } else if (detectedPatterns.length > 0) {
    recommendation = 'Errors detected but no auto-fixes available. Manual intervention required.';
  } else {
    recommendation = 'No significant error patterns detected.';
  }

  return {
    totalErrors: errorLines.length,
    errorsByCategory,
    detectedPatterns,
    fixes: allFixes,
    recommendation,
  };
}

/**
 * Apply code fixes
 */
function applyFixes(fixes: CodeFix[]): { applied: number; failed: number } {
  let applied = 0;
  let failed = 0;

  for (const fix of fixes) {
    try {
      const filePath = resolve(process.cwd(), fix.file);
      
      if (!existsSync(filePath)) {
        console.log(`File not found: ${fix.file}`);
        failed++;
        continue;
      }

      const content = readFileSync(filePath, 'utf-8');
      
      if (!content.includes(fix.search)) {
        console.log(`Search pattern not found in ${fix.file}: ${fix.search}`);
        failed++;
        continue;
      }

      const newContent = content.replace(fix.search, fix.replace);
      
      // Check if AUTO_FIX_ENABLED is true before writing
      if (process.env.AUTO_FIX_ENABLED === 'true') {
        // Actual fix application - write to file
        writeFileSync(filePath, newContent, 'utf-8');
        console.log(`✅ Applied fix to ${fix.file}:`);
        console.log(`  Description: ${fix.description}`);
        applied++;
      } else {
        // Dry-run mode - just log what would be changed
        console.log(`[DRY RUN] Would apply fix to ${fix.file}:`);
        console.log(`  Description: ${fix.description}`);
        console.log(`  Search: ${fix.search}`);
        console.log(`  Replace: ${fix.replace}`);
        console.log(`  Enable AUTO_FIX_ENABLED=true to apply fixes`);
        applied++;
      }
    } catch (error) {
      console.error(`Failed to apply fix to ${fix.file}:`, error);
      failed++;
    }
  }

  return { applied, failed };
}

/**
 * Commit and push changes
 */
async function commitAndPush(message: string): Promise<void> {
  try {
    execSync('git config user.name "GXQ Auto-Fix Bot"');
    execSync('git config user.email "bot@gxq.studio"');
    execSync('git add .');
    execSync(`git commit -m "${message}" --no-verify`);
    execSync('git push');
    console.log('✅ Changes committed and pushed');
  } catch (error) {
    console.error('Failed to commit and push:', error);
    throw error;
  }
}

/**
 * Create GitHub issue for errors
 */
async function createGitHubIssue(analysis: AnalysisResult): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.log('GITHUB_TOKEN not set, skipping issue creation');
    return;
  }

  const octokit = new Octokit({ auth: githubToken });
  
  const issueBody = `## 🚨 Post-Deployment Error Analysis

**Total Errors:** ${analysis.totalErrors}

### Errors by Category
${Object.entries(analysis.errorsByCategory)
  .map(([cat, count]) => `- **${cat}**: ${count}`)
  .join('\n')}

### Detected Patterns
${analysis.detectedPatterns
  .map(p => `- **${p.pattern}** (${p.severity}): ${p.count} occurrences ${p.autoFixable ? '✅ Auto-fixable' : '❌ Manual fix required'}`)
  .join('\n')}

### Auto-Fixes Applied
${analysis.fixes.length > 0 ? analysis.fixes.map(f => `- ${f.description}`).join('\n') : 'None'}

### Recommendation
${analysis.recommendation}

---
*This issue was automatically generated by the Post-Deployment Analyzer*
`;

  try {
    const { data: issue } = await octokit.issues.create({
      owner: process.env.GITHUB_REPOSITORY?.split('/')[0] || 'SMSDAO',
      repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || 'reimagined-jupiter',
      title: `Post-Deployment Analysis: ${analysis.totalErrors} errors detected`,
      body: issueBody,
      labels: ['automated', 'post-deployment', 'monitoring'],
    });

    console.log(`✅ GitHub issue created: #${issue.number}`);
  } catch (error) {
    console.error('Failed to create GitHub issue:', error);
  }
}

/**
 * Trigger Vercel deployment
 */
async function triggerVercelDeployment(): Promise<void> {
  const vercelToken = process.env.VERCEL_TOKEN;
  if (!vercelToken) {
    console.log('VERCEL_TOKEN not set, skipping deployment trigger');
    return;
  }

  try {
    const response = await axios.post(
      `https://api.vercel.com/v13/deployments`,
      {
        name: 'gxq-studio',
        gitSource: {
          type: 'github',
          repoId: process.env.VERCEL_PROJECT_ID,
          ref: 'main',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      },
    );

    console.log(`✅ Vercel deployment triggered: ${response.data.url}`);
  } catch (error) {
    console.error('Failed to trigger Vercel deployment:', error);
  }
}

/**
 * Main analysis function
 */
async function runPostDeploymentAnalysis(): Promise<void> {
  console.log('🔍 Starting post-deployment analysis...\n');

  // Configuration
  const autoFixEnabled = process.env.AUTO_FIX_ENABLED === 'true';
  const autoRedeployEnabled = process.env.AUTO_REDEPLOY_ENABLED === 'true';
  const minErrorThreshold = parseInt(process.env.MIN_ERROR_THRESHOLD || '5');

  // Parse logs
  const combinedLogPath = resolve(process.cwd(), 'combined.log');
  const errorLogPath = resolve(process.cwd(), 'error.log');

  const combinedErrors = parseLogFile(combinedLogPath);
  const errorLogErrors = parseLogFile(errorLogPath);
  const allErrors = [...combinedErrors, ...errorLogErrors];

  console.log(`Found ${allErrors.length} error lines in logs\n`);

  if (allErrors.length < minErrorThreshold) {
    console.log(`✅ Error count below threshold (${minErrorThreshold}), no action needed`);
    return;
  }

  // Analyze errors
  const analysis = analyzeErrors(allErrors);

  // Display results
  console.log('📊 Analysis Results:');
  console.log(`Total Errors: ${analysis.totalErrors}`);
  console.log('\nErrors by Category:');
  Object.entries(analysis.errorsByCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  console.log('\nDetected Patterns:');
  analysis.detectedPatterns.forEach(p => {
    console.log(`  ${p.pattern} (${p.severity}): ${p.count} occurrences ${p.autoFixable ? '✅' : '❌'}`);
  });

  console.log(`\n${analysis.recommendation}\n`);

  // Apply fixes if enabled
  if (autoFixEnabled && analysis.fixes.length > 0) {
    console.log('🔧 Applying auto-fixes...');
    const result = applyFixes(analysis.fixes);
    console.log(`Applied: ${result.applied}, Failed: ${result.failed}\n`);

    if (result.applied > 0) {
      // Commit and push
      await commitAndPush(`Auto-fix: Applied ${result.applied} fixes from post-deployment analysis`);

      // Trigger redeploy if enabled
      if (autoRedeployEnabled) {
        console.log('🚀 Triggering redeployment...');
        await triggerVercelDeployment();
      }
    }
  }

  // Create GitHub issue
  await createGitHubIssue(analysis);

  console.log('\n✅ Post-deployment analysis complete!');
}

// Main execution - check if script is run directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  runPostDeploymentAnalysis().catch(error => {
    console.error('Fatal error during analysis:', error);
    process.exit(1);
  });
}

export { runPostDeploymentAnalysis, analyzeErrors, ERROR_PATTERNS };
