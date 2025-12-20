#!/usr/bin/env node

/**
 * Intelligent Analyzer for Automated Cleanup
 * 
 * This script applies heuristic scoring to identify code and dependencies
 * that can be safely removed while preserving all security-critical paths.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Security-critical patterns that must NEVER be removed
const SECURITY_CRITICAL_PATTERNS = [
  /admin/i,
  /auth/i,
  /authentication/i,
  /dao/i,
  /governance/i,
  /security/i,
  /crypto/i,
  /signature/i,
  /wallet/i,
  /transaction/i,
  /token/i,
  /solana/i,
  /jupiter/i,
  /arbitrage/i,
  /flash.*loan/i,
];

// Heuristic scoring thresholds
const THRESHOLDS = {
  DEPENDENCIES: 70,
  FILES: 85,
  EXPORTS: 75,
};

// Scoring weights
const SCORES = {
  NEVER_EXECUTED: 40,    // 0% coverage
  UNUSED_EXPORTS: 30,    // Not imported anywhere
  STALE_CODE: 20,        // Not modified in 180+ days
  HIGH_COMPLEXITY: 25,   // Complexity >20, coverage <10%
  UNUSED_CONFIG: 35,     // Not used in deploy targets
  SECURITY_BLOCK: -1000, // Security-critical code
};

class IntelligentAnalyzer {
  constructor(analysisDir) {
    this.analysisDir = analysisDir;
    this.removalCandidates = {
      dependencies: [],
      files: [],
      exports: [],
    };
    this.preservedItems = [];
    this.metrics = {
      totalCandidates: 0,
      protectedItems: 0,
      cleanupImpactScore: 0,
    };
  }

  /**
   * Check if a path or name matches security-critical patterns
   */
  isSecurityCritical(name) {
    return SECURITY_CRITICAL_PATTERNS.some(pattern => pattern.test(name));
  }

  /**
   * Load analysis results from files
   */
  loadAnalysisResults() {
    const results = {};

    // Load unused exports
    const unusedExportsPath = join(this.analysisDir, 'unused-exports.txt');
    if (existsSync(unusedExportsPath)) {
      const content = readFileSync(unusedExportsPath, 'utf-8');
      results.unusedExports = this.parseUnusedExports(content);
    }

    // Load unused dependencies
    const unusedDepsPath = join(this.analysisDir, 'unused-deps.json');
    if (existsSync(unusedDepsPath)) {
      results.unusedDeps = JSON.parse(readFileSync(unusedDepsPath, 'utf-8'));
    }

    // Load coverage data
    const coveragePath = join(process.cwd(), 'coverage/coverage-summary.json');
    if (existsSync(coveragePath)) {
      results.coverage = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    }

    // Load complexity data
    const complexityPath = join(this.analysisDir, 'complexity.json');
    if (existsSync(complexityPath)) {
      results.complexity = JSON.parse(readFileSync(complexityPath, 'utf-8'));
    }

    // Load file modification dates via git
    results.fileModDates = this.getFileModificationDates();

    return results;
  }

  /**
   * Parse unused exports from ts-unused-exports output
   */
  parseUnusedExports(content) {
    const exports = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/(.+?):\s*(.+)/);
      if (match) {
        exports.push({
          file: match[1].trim(),
          export: match[2].trim(),
        });
      }
    }
    
    return exports;
  }

  /**
   * Get file modification dates from git
   */
  getFileModificationDates() {
    const dates = {};
    
    try {
      const output = execSync('git ls-files -z | xargs -0 -n1 -I{} git log -1 --format="%at {}" -- {}', {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\d+)\s+(.+)$/);
        if (match) {
          const timestamp = parseInt(match[1], 10);
          const file = match[2];
          dates[file] = new Date(timestamp * 1000);
        }
      }
    } catch (error) {
      console.warn('Could not fetch git modification dates:', error.message);
    }
    
    return dates;
  }

  /**
   * Calculate heuristic score for a dependency
   */
  scoreDependency(dep, results) {
    let score = 0;
    const name = dep.name || dep;

    // Security-critical check
    if (this.isSecurityCritical(name)) {
      return SCORES.SECURITY_BLOCK;
    }

    // Unused dependency check
    if (dep.unused) {
      score += SCORES.UNUSED_EXPORTS;
    }

    return score;
  }

  /**
   * Calculate heuristic score for a file
   */
  scoreFile(file, results) {
    let score = 0;

    // Security-critical check
    if (this.isSecurityCritical(file)) {
      return SCORES.SECURITY_BLOCK;
    }

    // Never executed (0% coverage)
    if (results.coverage && results.coverage[file]) {
      const fileCoverage = results.coverage[file];
      const statementCoverage = fileCoverage.statements?.pct || 100;
      
      if (statementCoverage === 0) {
        score += SCORES.NEVER_EXECUTED;
      }
      
      // High complexity + low usage
      if (results.complexity && results.complexity[file]) {
        const complexity = results.complexity[file];
        if (complexity > 20 && statementCoverage < 10) {
          score += SCORES.HIGH_COMPLEXITY;
        }
      }
    }

    // Stale code (180+ days)
    if (results.fileModDates && results.fileModDates[file]) {
      const daysSinceModification = (Date.now() - results.fileModDates[file]) / (1000 * 60 * 60 * 24);
      if (daysSinceModification > 180) {
        score += SCORES.STALE_CODE;
      }
    }

    return score;
  }

  /**
   * Calculate heuristic score for an export
   */
  scoreExport(exportItem, results) {
    let score = 0;

    // Security-critical check
    if (this.isSecurityCritical(exportItem.file) || this.isSecurityCritical(exportItem.export)) {
      return SCORES.SECURITY_BLOCK;
    }

    // Unused export
    score += SCORES.UNUSED_EXPORTS;

    // Check if file has 0% coverage
    if (results.coverage && results.coverage[exportItem.file]) {
      const fileCoverage = results.coverage[exportItem.file];
      const statementCoverage = fileCoverage.statements?.pct || 100;
      
      if (statementCoverage === 0) {
        score += SCORES.NEVER_EXECUTED;
      }
    }

    return score;
  }

  /**
   * Analyze dependencies
   */
  analyzeDependencies(results) {
    if (!results.unusedDeps) return;

    const deps = [
      ...(results.unusedDeps.dependencies || []),
      ...(results.unusedDeps.devDependencies || []),
    ];

    for (const dep of deps) {
      const score = this.scoreDependency(dep, results);
      
      if (score === SCORES.SECURITY_BLOCK) {
        this.preservedItems.push({
          type: 'dependency',
          name: dep,
          reason: 'Security-critical dependency',
        });
        this.metrics.protectedItems++;
      } else if (score >= THRESHOLDS.DEPENDENCIES) {
        this.removalCandidates.dependencies.push({
          name: dep,
          score,
          reason: this.getRemovalReason(score),
        });
        this.metrics.totalCandidates++;
        this.metrics.cleanupImpactScore += score;
      }
    }
  }

  /**
   * Analyze files
   */
  analyzeFiles(results) {
    if (!results.coverage) return;

    for (const [file, coverage] of Object.entries(results.coverage)) {
      // Skip summary entries
      if (file === 'total') continue;

      const score = this.scoreFile(file, results);
      
      if (score === SCORES.SECURITY_BLOCK) {
        this.preservedItems.push({
          type: 'file',
          name: file,
          reason: 'Security-critical file',
        });
        this.metrics.protectedItems++;
      } else if (score >= THRESHOLDS.FILES) {
        this.removalCandidates.files.push({
          name: file,
          score,
          reason: this.getRemovalReason(score),
        });
        this.metrics.totalCandidates++;
        this.metrics.cleanupImpactScore += score;
      }
    }
  }

  /**
   * Analyze exports
   */
  analyzeExports(results) {
    if (!results.unusedExports) return;

    for (const exportItem of results.unusedExports) {
      const score = this.scoreExport(exportItem, results);
      
      if (score === SCORES.SECURITY_BLOCK) {
        this.preservedItems.push({
          type: 'export',
          name: `${exportItem.file}:${exportItem.export}`,
          reason: 'Security-critical export',
        });
        this.metrics.protectedItems++;
      } else if (score >= THRESHOLDS.EXPORTS) {
        this.removalCandidates.exports.push({
          file: exportItem.file,
          export: exportItem.export,
          score,
          reason: this.getRemovalReason(score),
        });
        this.metrics.totalCandidates++;
        this.metrics.cleanupImpactScore += score;
      }
    }
  }

  /**
   * Get human-readable removal reason
   */
  getRemovalReason(score) {
    const reasons = [];
    
    if (score >= SCORES.NEVER_EXECUTED) {
      reasons.push('Never executed (0% coverage)');
    }
    if (score >= SCORES.UNUSED_EXPORTS) {
      reasons.push('Unused/not imported');
    }
    if (score >= SCORES.STALE_CODE) {
      reasons.push('Not modified in 180+ days');
    }
    if (score >= SCORES.HIGH_COMPLEXITY) {
      reasons.push('High complexity + low usage');
    }
    if (score >= SCORES.UNUSED_CONFIG) {
      reasons.push('Unused configuration');
    }
    
    return reasons.join(', ');
  }

  /**
   * Run complete analysis
   */
  analyze() {
    console.log('🔍 Loading analysis results...');
    const results = this.loadAnalysisResults();

    console.log('📊 Analyzing dependencies...');
    this.analyzeDependencies(results);

    console.log('📁 Analyzing files...');
    this.analyzeFiles(results);

    console.log('📤 Analyzing exports...');
    this.analyzeExports(results);

    // Sort candidates by score (highest first)
    this.removalCandidates.dependencies.sort((a, b) => b.score - a.score);
    this.removalCandidates.files.sort((a, b) => b.score - a.score);
    this.removalCandidates.exports.sort((a, b) => b.score - a.score);

    console.log('\n✅ Analysis complete!');
    this.printSummary();

    return {
      candidates: this.removalCandidates,
      preserved: this.preservedItems,
      metrics: this.metrics,
    };
  }

  /**
   * Print analysis summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Removal Candidates: ${this.metrics.totalCandidates}`);
    console.log(`Protected Items: ${this.metrics.protectedItems}`);
    console.log(`Cleanup Impact Score: ${this.metrics.cleanupImpactScore}`);
    console.log('\n📦 Dependencies to remove: ' + this.removalCandidates.dependencies.length);
    console.log('📁 Files to remove: ' + this.removalCandidates.files.length);
    console.log('📤 Exports to disable: ' + this.removalCandidates.exports.length);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Save results to files
   */
  saveResults(results) {
    const outputPath = join(this.analysisDir, 'removal-candidates.json');
    writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${outputPath}`);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const analysisDir = process.argv[2] || join(process.cwd(), '.cleanup-analysis');
  const analyzer = new IntelligentAnalyzer(analysisDir);
  
  try {
    const results = analyzer.analyze();
    analyzer.saveResults(results);
    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

export default IntelligentAnalyzer;
