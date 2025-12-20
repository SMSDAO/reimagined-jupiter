#!/usr/bin/env node

/**
 * Execute Cleanup
 * 
 * Safely removes unused dependencies, files, and disables exports
 * based on the intelligent analysis results.
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

class CleanupExecutor {
  constructor(analysisDir) {
    this.analysisDir = analysisDir;
    this.changes = {
      removedDependencies: [],
      removedFiles: [],
      disabledExports: [],
      errors: [],
    };
  }

  /**
   * Load removal candidates from analysis
   */
  loadCandidates() {
    const candidatesPath = join(this.analysisDir, 'removal-candidates.json');
    if (!existsSync(candidatesPath)) {
      throw new Error('Removal candidates file not found. Run analysis first.');
    }
    
    return JSON.parse(readFileSync(candidatesPath, 'utf-8'));
  }

  /**
   * Remove unused dependencies
   */
  removeDependencies(candidates) {
    console.log('\n📦 Removing unused dependencies...');
    
    if (!candidates || candidates.length === 0) {
      console.log('  No dependencies to remove.');
      return;
    }

    const depsToRemove = candidates.map(c => c.name);
    
    // Remove from backend package.json
    this.removeDepsFromPackage('package.json', depsToRemove);
    
    // Remove from webapp package.json
    this.removeDepsFromPackage('webapp/package.json', depsToRemove);
  }

  /**
   * Remove dependencies from package.json
   */
  removeDepsFromPackage(packagePath, depsToRemove) {
    const fullPath = join(process.cwd(), packagePath);
    
    if (!existsSync(fullPath)) {
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(fullPath, 'utf-8'));
      let removed = false;

      for (const dep of depsToRemove) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          delete packageJson.dependencies[dep];
          console.log(`  ✓ Removed ${dep} from ${packagePath} dependencies`);
          this.changes.removedDependencies.push({ package: packagePath, dep });
          removed = true;
        }
        
        if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
          delete packageJson.devDependencies[dep];
          console.log(`  ✓ Removed ${dep} from ${packagePath} devDependencies`);
          this.changes.removedDependencies.push({ package: packagePath, dep });
          removed = true;
        }
      }

      if (removed) {
        writeFileSync(fullPath, JSON.stringify(packageJson, null, 2) + '\n');
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${packagePath}:`, error.message);
      this.changes.errors.push({
        type: 'dependency',
        package: packagePath,
        error: error.message,
      });
    }
  }

  /**
   * Remove unused files
   */
  removeFiles(candidates) {
    console.log('\n📁 Removing unused files...');
    
    if (!candidates || candidates.length === 0) {
      console.log('  No files to remove.');
      return;
    }

    for (const candidate of candidates) {
      const filePath = join(process.cwd(), candidate.name);
      
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
          console.log(`  ✓ Removed ${candidate.name} (score: ${candidate.score})`);
          this.changes.removedFiles.push(candidate.name);
        }
      } catch (error) {
        console.error(`  ❌ Error removing ${candidate.name}:`, error.message);
        this.changes.errors.push({
          type: 'file',
          file: candidate.name,
          error: error.message,
        });
      }
    }
  }

  /**
   * Disable unused exports by commenting them out
   */
  disableExports(candidates) {
    console.log('\n📤 Disabling unused exports...');
    
    if (!candidates || candidates.length === 0) {
      console.log('  No exports to disable.');
      return;
    }

    // Group exports by file
    const exportsByFile = {};
    for (const candidate of candidates) {
      if (!exportsByFile[candidate.file]) {
        exportsByFile[candidate.file] = [];
      }
      exportsByFile[candidate.file].push(candidate);
    }

    // Process each file
    for (const [file, exports] of Object.entries(exportsByFile)) {
      this.disableExportsInFile(file, exports);
    }
  }

  /**
   * Disable exports in a specific file
   */
  disableExportsInFile(file, exports) {
    const filePath = join(process.cwd(), file);
    
    if (!existsSync(filePath)) {
      console.log(`  ⚠️ File not found: ${file}`);
      return;
    }

    try {
      let content = readFileSync(filePath, 'utf-8');
      let modified = false;

      for (const exportCandidate of exports) {
        const exportName = exportCandidate.export;
        
        // Patterns to match different export styles
        const patterns = [
          // export const/function/class name
          new RegExp(`^(\\s*)(export\\s+(?:const|let|var|function|class)\\s+${exportName}\\b.*)$`, 'gm'),
          // export { name }
          new RegExp(`^(\\s*)(export\\s*{[^}]*\\b${exportName}\\b[^}]*})`, 'gm'),
          // export default name
          new RegExp(`^(\\s*)(export\\s+default\\s+${exportName}\\b.*)$`, 'gm'),
        ];

        for (const pattern of patterns) {
          const newContent = content.replace(pattern, (match, indent, exportLine) => {
            modified = true;
            return `${indent}// UNUSED: ${exportLine}`;
          });
          
          if (newContent !== content) {
            content = newContent;
            console.log(`  ✓ Disabled export "${exportName}" in ${file}`);
            this.changes.disabledExports.push({ file, export: exportName });
            break;
          }
        }
      }

      if (modified) {
        writeFileSync(filePath, content);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error.message);
      this.changes.errors.push({
        type: 'export',
        file,
        error: error.message,
      });
    }
  }

  /**
   * Generate cleanup summary markdown
   */
  generateSummary(analysisResults) {
    const summary = [];
    
    summary.push('# 🧹 Automated Cleanup Summary\n');
    summary.push(`**Generated**: ${new Date().toISOString()}\n`);
    summary.push('---\n');
    
    summary.push('## 📊 Analysis Metrics\n');
    summary.push(`- **Total Removal Candidates**: ${analysisResults.metrics.totalCandidates}`);
    summary.push(`- **Protected Items**: ${analysisResults.metrics.protectedItems}`);
    summary.push(`- **Cleanup Impact Score**: ${analysisResults.metrics.cleanupImpactScore}\n`);
    
    summary.push('## 📦 Dependencies Removed\n');
    if (this.changes.removedDependencies.length > 0) {
      for (const dep of this.changes.removedDependencies) {
        summary.push(`- \`${dep.dep}\` from ${dep.package}`);
      }
    } else {
      summary.push('*No dependencies removed*');
    }
    summary.push('');
    
    summary.push('## 📁 Files Removed\n');
    if (this.changes.removedFiles.length > 0) {
      for (const file of this.changes.removedFiles) {
        summary.push(`- \`${file}\``);
      }
    } else {
      summary.push('*No files removed*');
    }
    summary.push('');
    
    summary.push('## 📤 Exports Disabled\n');
    if (this.changes.disabledExports.length > 0) {
      for (const exp of this.changes.disabledExports) {
        summary.push(`- \`${exp.export}\` in ${exp.file}`);
      }
    } else {
      summary.push('*No exports disabled*');
    }
    summary.push('');
    
    summary.push('## 🛡️ Security-Critical Items Preserved\n');
    if (analysisResults.preserved.length > 0) {
      for (const item of analysisResults.preserved) {
        summary.push(`- **${item.type}**: \`${item.name}\` - ${item.reason}`);
      }
    } else {
      summary.push('*No security-critical items found in candidates*');
    }
    summary.push('');
    
    if (this.changes.errors.length > 0) {
      summary.push('## ⚠️ Errors\n');
      for (const error of this.changes.errors) {
        summary.push(`- **${error.type}**: ${error.file || error.package} - ${error.error}`);
      }
      summary.push('');
    }
    
    summary.push('---');
    summary.push('\n*Generated by automated cleanup workflow*');
    summary.push('*Heuristic scoring system applied*');
    summary.push('*Test-aware pruning completed*');
    
    return summary.join('\n');
  }

  /**
   * Execute cleanup
   */
  async execute() {
    console.log('🧹 Starting cleanup execution...\n');
    
    // Load candidates
    const analysisResults = this.loadCandidates();
    
    // Execute cleanup operations
    this.removeDependencies(analysisResults.candidates.dependencies);
    this.removeFiles(analysisResults.candidates.files);
    this.disableExports(analysisResults.candidates.exports);
    
    // Generate summary
    const summary = this.generateSummary(analysisResults);
    const summaryPath = join(this.analysisDir, 'cleanup-summary.md');
    writeFileSync(summaryPath, summary);
    console.log(`\n💾 Summary saved to: ${summaryPath}`);
    
    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(60));
    console.log(`Dependencies removed: ${this.changes.removedDependencies.length}`);
    console.log(`Files removed: ${this.changes.removedFiles.length}`);
    console.log(`Exports disabled: ${this.changes.disabledExports.length}`);
    console.log(`Errors: ${this.changes.errors.length}`);
    console.log('='.repeat(60) + '\n');
    
    // Return success/failure
    return this.changes.errors.length === 0;
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const analysisDir = process.argv[2] || join(process.cwd(), '.cleanup-analysis');
  const executor = new CleanupExecutor(analysisDir);
  
  executor.execute()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
}

export default CleanupExecutor;
