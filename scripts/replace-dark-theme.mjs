#!/usr/bin/env node
/**
 * Safely replace dark-theme patterns with light-theme tokens.
 *
 * Strategy: parse each file line by line, detect STRING LITERALS (single/double
 * quoted), and within each string literal only replace matching patterns.
 *
 * This avoids the quote nesting problem.
 */
import fs from 'fs';
import path from 'path';

const PAGES_DIR = path.join(process.cwd(), 'frontend', 'src', 'pages');
const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));

// Patterns to replace (value only, no quotes)
const rgbaPatterns = [
  [/rgba\(22\s*,\s*28\s*,\s*45\s*,\s*0\.65\)/g, 'var(--bg-card)'],
  [/rgba\(22\s*,\s*28\s*,\s*45\s*,\s*0\.7\)/g, 'var(--bg-card)'],
  [/rgba\(22\s*,\s*28\s*,\s*45\s*,\s*0\.5\)/g, 'var(--bg-card)'],
  [/rgba\(22\s*,\s*28\s*,\s*45\s*,\s*0\.4\)/g, 'var(--bg-card)'],
  [/rgba\(22\s*,\s*28\s*,\s*45\s*,\s*0\.3\)/g, 'var(--bg-card-hover)'],
  [/rgba\(22\s*,\s*28\s*,\s*45\s*,\s*0\.2\)/g, 'var(--bg-card-hover)'],
  [/rgba\(13\s*,\s*17\s*,\s*26\s*,\s*0\.95\)/g, 'var(--bg-card)'],
  [/rgba\(13\s*,\s*17\s*,\s*26\s*,\s*0\.9\)/g, 'var(--bg-card)'],
  [/rgba\(13\s*,\s*17\s*,\s*26\s*,\s*0\.8\)/g, 'var(--bg-card)'],
  [/rgba\(13\s*,\s*17\s*,\s*26\s*,\s*0\.5\)/g, 'var(--bg-card-hover)'],
  [/rgba\(15\s*,\s*18\s*,\s*29\s*,\s*0\.4\)/g, 'rgba(255, 255, 255, 0.85)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.02\)/g, 'var(--bg-card-hover)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.03\)/g, 'var(--bg-card-hover)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.04\)/g, 'var(--bg-card-hover)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.05\)/g, 'var(--bg-card-hover)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.06\)/g, 'var(--bg-card-hover)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.08\)/g, 'var(--bg-card-hover)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.1\)/g, 'var(--bg-overlay)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.15\)/g, 'var(--bg-overlay)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.07\)/g, 'var(--border-glass)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.12\)/g, 'var(--border-glass)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.2\)/g, 'var(--border-glass)'],
  [/rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.3\)/g, 'var(--text-muted)'],
  [/rgba\(0\s*,\s*0\s*,\s*0\s*,\s*0\.2\)/g, 'var(--bg-card-hover)'],
  [/rgba\(0\s*,\s*0\s*,\s*0\s*,\s*0\.25\)/g, 'var(--bg-card-hover)'],
  [/rgba\(0\s*,\s*0\s*,\s*0\s*,\s*0\.3\)/g, 'var(--bg-card-hover)'],
  [/rgba\(225\s*,\s*29\s*,\s*72\s*,\s*0\.1\)/g, 'var(--primary-glow)'],
  [/rgba\(225\s*,\s*29\s*,\s*72\s*,\s*0\.2\)/g, 'var(--primary-soft)'],
  [/rgba\(225\s*,\s*29\s*,\s*72\s*,\s*0\.25\)/g, 'var(--primary-soft)'],
  [/rgba\(225\s*,\s*29\s*,\s*72\s*,\s*0\.3\)/g, 'var(--primary-soft)'],
  [/rgba\(225\s*,\s*29\s*,\s*72\s*,\s*0\.5\)/g, 'var(--primary-soft)'],
  [/rgba\(225\s*,\s*29\s*,\s*72\s*,\s*0\.6\)/g, 'var(--primary-hover)'],
  [/rgba\(225\s*,\s*29\s*,\s*72\s*,\s*0\.8\)/g, 'var(--primary-hover)'],
];

// Hex color replacements (already quoted)
const hexPatterns = [
  [/'#f87171'/g, "'var(--danger-text)'"],
  [/'#ef4444'/g, "'var(--danger)'"],
  [/'#fbbf24'/g, "'var(--warning-text)'"],
  [/'#f59e0b'/g, "'var(--warning)'"],
  [/'#34d399'/g, "'var(--success-text)'"],
  [/'#10b981'/g, "'var(--success)'"],
  [/'#60a5fa'/g, "'var(--info-text)'"],
  [/'#3b82f6'/g, "'var(--info)'"],
  [/'#22c55e'/g, "'var(--success-text)'"],
  [/'#16a34a'/g, "'var(--success)'"],
  [/'#fb923c'/g, "'var(--warning-text)'"],
  [/'#fff'/g, "'var(--text-primary)'"],
  [/'#f3f4f6'/g, "'var(--text-primary)'"],
  [/'#e5e7eb'/g, "'var(--text-primary)'"],
  [/'#d1d5db'/g, "'var(--text-secondary)'"],
];

/**
 * Replace values inside JS string literals without breaking quoting.
 * Handles both single-quoted '...' and double-quoted "..." strings.
 * For templates, only replaces inside simple ${...} string literals.
 */
function processLine(line) {
  // Process hex patterns first (already with quotes)
  for (const [pattern, replacement] of hexPatterns) {
    line = line.replace(pattern, replacement);
  }

  // For rgba patterns, we need to find them inside string literals.
  // We'll iterate through the line character by character, tracking
  // whether we're inside a string literal, and replace inside them.
  let result = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escape = false;

  while (i < line.length) {
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : '';
    const next = i + 1 < line.length ? line[i + 1] : '';

    if (escape) {
      result += ch;
      escape = false;
      i++;
      continue;
    }

    if (ch === '\\' && (inSingle || inDouble || inTemplate)) {
      result += ch;
      escape = true;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === "'") {
        inSingle = true;
        result += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inDouble = true;
        result += ch;
        i++;
        continue;
      }
      if (ch === '`') {
        inTemplate = true;
        result += ch;
        i++;
        continue;
      }
      result += ch;
      i++;
      continue;
    }

    // We're inside some kind of string literal
    if (inSingle && ch === "'") {
      inSingle = false;
      result += ch;
      i++;
      continue;
    }
    if (inDouble && ch === '"') {
      inDouble = false;
      result += ch;
      i++;
      continue;
    }
    if (inTemplate && ch === '`') {
      inTemplate = false;
      result += ch;
      i++;
      continue;
    }

    // Inside a string - check if this position starts an rgba( pattern
    let matched = false;
    for (const [pattern, replacement] of rgbaPatterns) {
      const slice = line.slice(i);
      const m = slice.match(pattern);
      if (m && m.index === 0) {
        result += replacement;
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += ch;
      i++;
    }
  }

  return result;
}

let totalFiles = 0;
let totalReplacements = 0;

for (const f of files) {
  const filePath = path.join(PAGES_DIR, f);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const lines = content.split('\n');
  let fileChanges = 0;
  for (let i = 0; i < lines.length; i++) {
    const newLine = processLine(lines[i]);
    if (newLine !== lines[i]) fileChanges++;
    lines[i] = newLine;
  }
  content = lines.join('\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${f} (${fileChanges} lines changed)`);
    totalFiles++;
    totalReplacements += fileChanges;
  }
}

console.log(`\nTotal: ${totalFiles} files, ${totalReplacements} lines changed`);