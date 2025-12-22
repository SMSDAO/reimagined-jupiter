#!/usr/bin/env node

/**
 * Test Coverage Gap Analyzer
 * 
 * Analyzes test coverage and identifies files that need tests.
 * Generates test templates for uncovered code.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = '/tmp/coverage-analysis';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Parse coverage summary
 */
function parseCoverageSummary() {
  const coveragePath = path.join(process.cwd(), 'coverage/coverage-summary.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.log('⚠️  No coverage data found. Run tests with coverage first.');
    return null;
  }
  
  return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
}

/**
 * Find files with low or no coverage
 */
function findLowCoverageFiles(coverage, threshold = 80) {
  if (!coverage) return [];
  
  const lowCoverageFiles = [];
  
  for (const [file, data] of Object.entries(coverage)) {
    if (file === 'total') continue;
    
    const lineCoverage = data.lines.pct;
    const branchCoverage = data.branches.pct;
    const functionCoverage = data.functions.pct;
    
    if (lineCoverage < threshold || functionCoverage < threshold) {
      lowCoverageFiles.push({
        file,
        lines: lineCoverage,
        branches: branchCoverage,
        functions: functionCoverage,
        uncoveredLines: data.lines.total - data.lines.covered,
        uncoveredFunctions: data.functions.total - data.functions.covered
      });
    }
  }
  
  // Sort by coverage (lowest first)
  return lowCoverageFiles.sort((a, b) => a.lines - b.lines);
}

/**
 * Find source files without any test file
 */
function findFilesWithoutTests() {
  const srcDir = path.join(process.cwd(), 'src');
  const filesWithoutTests = [];
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.includes('__tests__')) {
        walkDir(fullPath);
      } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.spec.ts')) {
        // Check if corresponding test file exists
        const testFile1 = fullPath.replace('.ts', '.test.ts');
        const testFile2 = fullPath.replace('.ts', '.spec.ts');
        const testDir = path.join(path.dirname(fullPath), '__tests__', path.basename(fullPath).replace('.ts', '.test.ts'));
        
        if (!fs.existsSync(testFile1) && !fs.existsSync(testFile2) && !fs.existsSync(testDir)) {
          filesWithoutTests.push(fullPath);
        }
      }
    }
  }
  
  if (fs.existsSync(srcDir)) {
    walkDir(srcDir);
  }
  
  return filesWithoutTests;
}

/**
 * Extract functions from a TypeScript file
 */
function extractFunctions(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const functions = [];
    
    // Match function declarations and expressions
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2];
      if (funcName) {
        functions.push(funcName);
      }
    }
    
    // Match class methods
    const methodRegex = /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      if (methodName && !['constructor', 'if', 'for', 'while'].includes(methodName)) {
        functions.push(methodName);
      }
    }
    
    return [...new Set(functions)]; // Remove duplicates
  } catch (error) {
    console.error(`Error extracting functions from ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Generate test template for a file
 */
function generateTestTemplate(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const fileName = path.basename(filePath, '.ts');
  const functions = extractFunctions(filePath);
  
  let template = `import { ${functions.join(', ')} } from '../${fileName}';

describe('${fileName}', () => {
`;
  
  if (functions.length === 0) {
    template += `  it('should be tested', () => {
    // TODO: Add tests for this module
    expect(true).toBe(true);
  });
`;
  } else {
    for (const func of functions) {
      template += `  describe('${func}', () => {
    it('should work correctly', () => {
      // TODO: Implement test for ${func}
      expect(${func}).toBeDefined();
    });
    
    it('should handle edge cases', () => {
      // TODO: Test edge cases
    });
    
    it('should handle errors gracefully', () => {
      // TODO: Test error handling
    });
  });
  
`;
    }
  }
  
  template += `});
`;
  
  return template;
}

/**
 * Generate coverage gap report
 */
function generateReport(lowCoverageFiles, filesWithoutTests, totalCoverage) {
  let report = `# Test Coverage Gap Analysis

**Generated**: ${new Date().toISOString()}

## Summary

`;
  
  if (totalCoverage) {
    const total = totalCoverage.total;
    report += `### Overall Coverage

- **Lines**: ${total.lines.pct.toFixed(2)}% (${total.lines.covered}/${total.lines.total})
- **Branches**: ${total.branches.pct.toFixed(2)}% (${total.branches.covered}/${total.branches.total})
- **Functions**: ${total.functions.pct.toFixed(2)}% (${total.functions.covered}/${total.functions.total})
- **Statements**: ${total.statements.pct.toFixed(2)}% (${total.statements.covered}/${total.statements.total})

`;
  }
  
  report += `### Gap Statistics

- **Files with Low Coverage**: ${lowCoverageFiles.length}
- **Files Without Tests**: ${filesWithoutTests.length}
- **Total Files Needing Attention**: ${lowCoverageFiles.length + filesWithoutTests.length}

---

## Files with Low Coverage (<80%)

`;
  
  if (lowCoverageFiles.length === 0) {
    report += `✅ All files meet the 80% coverage threshold!

`;
  } else {
    report += `| File | Lines | Functions | Branches | Priority |
|------|-------|-----------|----------|----------|
`;
    
    for (const file of lowCoverageFiles.slice(0, 30)) {
      const priority = file.lines < 50 ? '🔴 High' : file.lines < 70 ? '🟡 Medium' : '🟢 Low';
      const shortPath = file.file.split('/').slice(-3).join('/');
      report += `| ${shortPath} | ${file.lines.toFixed(1)}% | ${file.functions.toFixed(1)}% | ${file.branches.toFixed(1)}% | ${priority} |\n`;
    }
    
    report += `
`;
  }
  
  report += `## Files Without Test Coverage

`;
  
  if (filesWithoutTests.length === 0) {
    report += `✅ All source files have corresponding test files!

`;
  } else {
    report += `The following files have no associated test file:

`;
    for (const file of filesWithoutTests.slice(0, 30)) {
      const shortPath = file.split('/').slice(-3).join('/');
      report += `- \`${shortPath}\`\n`;
    }
    
    if (filesWithoutTests.length > 30) {
      report += `\n... and ${filesWithoutTests.length - 30} more files\n`;
    }
    
    report += `
`;
  }
  
  report += `## Recommendations

### Immediate Actions (High Priority)

`;
  
  const highPriorityFiles = lowCoverageFiles.filter(f => f.lines < 50);
  if (highPriorityFiles.length > 0) {
    for (const file of highPriorityFiles.slice(0, 5)) {
      const shortPath = file.file.split('/').slice(-3).join('/');
      report += `1. **${shortPath}**
   - Current Coverage: ${file.lines.toFixed(1)}%
   - Uncovered Functions: ${file.uncoveredFunctions}
   - Uncovered Lines: ${file.uncoveredLines}
   - Action: Add comprehensive tests for all functions

`;
    }
  } else {
    report += `✅ No high-priority files identified

`;
  }
  
  report += `### Medium Priority

`;
  
  const mediumPriorityFiles = lowCoverageFiles.filter(f => f.lines >= 50 && f.lines < 70);
  if (mediumPriorityFiles.length > 0) {
    for (const file of mediumPriorityFiles.slice(0, 5)) {
      const shortPath = file.file.split('/').slice(-3).join('/');
      report += `- ${shortPath} (${file.lines.toFixed(1)}% coverage)\n`;
    }
    report += `
`;
  }
  
  report += `### Next Steps

1. **Generate Test Templates**: Use the generated templates in \`${OUTPUT_DIR}/templates/\`
2. **Implement Tests**: Fill in the TODO items in generated templates
3. **Run Tests**: Validate new tests pass with \`npm test\`
4. **Verify Coverage**: Ensure coverage improves after adding tests
5. **Iterate**: Repeat for remaining files

## Generated Test Templates

Test templates have been generated for files without tests. Find them in:

\`\`\`
${OUTPUT_DIR}/templates/
\`\`\`

To use a template:

\`\`\`bash
cp ${OUTPUT_DIR}/templates/example.test.ts src/__tests__/example.test.ts
# Edit the file to implement actual tests
npm test
\`\`\`

---

*Generated by Test Coverage Gap Analyzer*
`;
  
  return report;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing test coverage gaps...\n');
  
  // Parse coverage data
  const coverage = parseCoverageSummary();
  
  // Find files with low coverage
  console.log('📊 Finding files with low coverage...');
  const lowCoverageFiles = findLowCoverageFiles(coverage, 80);
  console.log(`   Found ${lowCoverageFiles.length} files with <80% coverage\n`);
  
  // Find files without tests
  console.log('📁 Finding files without tests...');
  const filesWithoutTests = findFilesWithoutTests();
  console.log(`   Found ${filesWithoutTests.length} files without tests\n`);
  
  // Generate test templates
  console.log('📝 Generating test templates...');
  const templateDir = path.join(OUTPUT_DIR, 'templates');
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }
  
  let templatesGenerated = 0;
  for (const file of filesWithoutTests.slice(0, 10)) { // Limit to 10 to avoid overwhelming
    const template = generateTestTemplate(file);
    const templateName = path.basename(file, '.ts') + '.test.ts';
    const templatePath = path.join(templateDir, templateName);
    fs.writeFileSync(templatePath, template);
    templatesGenerated++;
  }
  console.log(`   Generated ${templatesGenerated} test templates\n`);
  
  // Generate report
  console.log('📄 Generating comprehensive report...');
  const report = generateReport(lowCoverageFiles, filesWithoutTests, coverage);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'coverage-gap-report.md'), report);
  
  // Output summary
  console.log('\n✅ Analysis complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Files with low coverage: ${lowCoverageFiles.length}`);
  console.log(`   - Files without tests: ${filesWithoutTests.length}`);
  console.log(`   - Test templates generated: ${templatesGenerated}`);
  console.log(`\n📁 Reports saved to: ${OUTPUT_DIR}/`);
  console.log(`\nView full report: ${OUTPUT_DIR}/coverage-gap-report.md\n`);
  
  // Return exit code based on coverage
  if (coverage && coverage.total.lines.pct < 70) {
    console.log('⚠️  Warning: Overall coverage is below 70%');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = { parseCoverageSummary, findLowCoverageFiles, findFilesWithoutTests };
