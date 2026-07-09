#!/usr/bin/env node
/**
 * Fix double-quote pattern introduced by replace-dark-theme script.
 * Pattern: ''var(--xxx)''  -> 'var(--xxx)'
 */
import fs from 'fs';
import path from 'path';

const PAGES_DIR = path.join(process.cwd(), 'frontend', 'src', 'pages');
const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));

let totalFixes = 0;
for (const f of files) {
  const filePath = path.join(PAGES_DIR, f);
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;

  // Replace ''var(--xxx)'' with 'var(--xxx)'
  content = content.replace(/''var\((--[a-z-]+)\)''/g, "'var($1)'");

  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    const matches = before.match(/''var\(--[a-z-]+\)''/g) || [];
    totalFixes += matches.length;
    console.log(`✓ ${f} (${matches.length} fixes)`);
  }
}

console.log(`\nTotal: ${totalFixes} fixes`);