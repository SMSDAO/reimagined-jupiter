/**
 * Script to replace console.log statements with proper Winston logger
 * This addresses the security and error handling requirements
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FileStats {
  file: string;
  consoleCount: number;
  replaced: boolean;
}

const stats: FileStats[] = [];

/**
 * Replace console statements in a file
 */
function replaceConsoleInFile(filePath: string): number {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let replacements = 0;

  // Check if logger is already imported
  const hasLoggerImport = content.includes("from './logger.js'") || 
                          content.includes("from '../utils/logger.js'") ||
                          content.includes("from '../../utils/logger.js'");

  // Count console statements
  const consoleMatches = content.match(/console\.(log|error|warn|info|debug)/g);
  const consoleCount = consoleMatches ? consoleMatches.length : 0;

  if (consoleCount === 0) {
    return 0;
  }

  // Calculate relative path to logger
  const fileDir = path.dirname(filePath);
  const utilsDir = path.join(path.dirname(__dirname), 'src', 'utils');
  const relativePath = path.relative(fileDir, utilsDir).replace(/\\/g, '/') || '.';
  const loggerImport = `${relativePath}/logger.js`;

  // Add logger import if not present
  if (!hasLoggerImport) {
    // Find the last import statement
    const importRegex = /^import\s+.*?from\s+['"].*?['"];?\s*$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      
      content = content.slice(0, insertPosition) +
        `\nimport { Logger } from '${loggerImport}';\n\nconst logger = new Logger('${getContextFromPath(filePath)}');\n` +
        content.slice(insertPosition);
      
      replacements++;
    }
  }

  // Replace console.error with logger.error
  content = content.replace(
    /console\.error\(['"]([^'"]*)['"]\s*,\s*([^)]+)\)/g,
    'logger.error(\'$1\', $2)'
  );
  content = content.replace(
    /console\.error\(['"]([^'"]*)['"]\)/g,
    'logger.error(\'$1\')'
  );

  // Replace console.warn with logger.warn
  content = content.replace(
    /console\.warn\(['"]([^'"]*)['"]\s*,\s*([^)]+)\)/g,
    'logger.warn(\'$1\', { data: $2 })'
  );
  content = content.replace(
    /console\.warn\(['"]([^'"]*)['"]\)/g,
    'logger.warn(\'$1\')'
  );

  // Replace console.log with logger.info
  content = content.replace(
    /console\.log\(['"]([^'"]*)['"]\s*,\s*([^)]+)\)/g,
    'logger.info(\'$1\', { data: $2 })'
  );
  content = content.replace(
    /console\.log\(['"]([^'"]*)['"]\)/g,
    'logger.info(\'$1\')'
  );

  // Replace console.info with logger.info
  content = content.replace(
    /console\.info\(['"]([^'"]*)['"]\s*,\s*([^)]+)\)/g,
    'logger.info(\'$1\', { data: $2 })'
  );
  content = content.replace(
    /console\.info\(['"]([^'"]*)['"]\)/g,
    'logger.info(\'$1\')'
  );

  // Replace console.debug with logger.debug
  content = content.replace(
    /console\.debug\(['"]([^'"]*)['"]\s*,\s*([^)]+)\)/g,
    'logger.debug(\'$1\', { data: $2 })'
  );
  content = content.replace(
    /console\.debug\(['"]([^'"]*)['"]\)/g,
    'logger.debug(\'$1\')'
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    replacements += consoleCount;
    console.log(`✓ Fixed ${consoleCount} console statements in ${path.basename(filePath)}`);
  }

  return replacements;
}

/**
 * Get context name from file path
 */
function getContextFromPath(filePath: string): string {
  const basename = path.basename(filePath, path.extname(filePath));
  
  // Convert kebab-case or snake_case to PascalCase
  return basename
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Recursively process directory
 */
function processDirectory(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, dist, and test directories
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') {
        continue;
      }
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      const replaced = replaceConsoleInFile(fullPath);
      
      if (replaced > 0) {
        stats.push({
          file: fullPath,
          consoleCount: replaced,
          replaced: true,
        });
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Fixing console.log statements in backend...\n');

  const srcDir = path.join(path.dirname(__dirname), 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src directory not found');
    process.exit(1);
  }

  processDirectory(srcDir);

  console.log('\n📊 Summary:');
  console.log(`Total files processed: ${stats.length}`);
  console.log(`Total console statements replaced: ${stats.reduce((sum, s) => sum + s.consoleCount, 0)}`);
  
  if (stats.length > 0) {
    console.log('\n✅ Console logging replaced with Winston logger');
  } else {
    console.log('\n✓ No console statements found');
  }
}

main();
