#!/usr/bin/env node
/**
 * Fix syntax errors caused by quote nesting issues from the replacement script.
 * The replace script did: 'rgba(225,29,72,0.3)' -> 'var(--primary-soft)'
 * But in some contexts the original had: '1px solid rgba(225,29,72,0.3)'
 * After replace: '1px solid 'var(--primary-soft)'' (DOUBLE QUOTE PROBLEM)
 *
 * This script detects such patterns and merges them properly:
 *   'X 'var(--yyy)' -> 'X var(--yyy)'
 *   'linear-gradient('var(--yyy)', ...' -> "linear-gradient(var(--yyy), ...' (using template literal)
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

  // Fix 1: '1px solid 'var(--xxx)'' -> '1px solid var(--xxx)'
  // Match patterns like:  'text'var(--name)'  where 'text' is anything ending without quote
  // Use [^']* to avoid greedy
  content = content.replace(/'([^'\n]*?)'var\((--[a-z-]+)\)'(?!\w)/g, "'$1 var($2)'");

  // Fix 2: 'linear-gradient('var(--xxx)' -> 'linear-gradient(var(--xxx)'
  // For CSS gradient with tokens inside
  content = content.replace(/'linear-gradient\('var\((--[a-z-]+)\)'/g, "'linear-gradient(var($1)'");

  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    const matches = (before.match(/'[^'\n]*?'var\(/g) || []).length;
    console.log(`✓ ${f} (${matches} fixes)`);
    totalFixes++;
  }
}

console.log(`\nTotal files fixed: ${totalFixes}`);