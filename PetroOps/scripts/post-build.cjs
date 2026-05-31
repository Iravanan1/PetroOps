/**
 * post-build.cjs — PetroOps Desktop Packaging Helper
 * ────────────────────────────────────────────────
 * Programmatically copies all compiled server assets recursively and
 * writes the CommonJS scope configuration file to guarantee correct execution.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'dist', 'server');
const targetDir = path.join(__dirname, '..', 'server-dist');
const targetFile = path.join(targetDir, 'package.json');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  
  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    // Ensure parent dir exists
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

try {
  console.log(`[Post-Build] Starting programmatic recursive server copy...`);
  console.log(`[Post-Build] Source: ${srcDir}`);
  console.log(`[Post-Build] Destination: ${targetDir}`);
  
  // 1. Copy compiled server files recursively
  copyRecursiveSync(srcDir, targetDir);
  console.log(`[Post-Build] Programmatic recursive server copy completed successfully.`);

  // 2. Write CJS package.json scope configuration
  const payload = {
    type: 'commonjs'
  };

  fs.writeFileSync(targetFile, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`[Post-Build] Successfully wrote CommonJS configuration to: ${targetFile}`);
} catch (err) {
  console.error('[Post-Build] Critical error in post-build helper:', err);
  process.exit(1);
}
