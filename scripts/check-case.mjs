// Usage (from the repo root):  node scripts/check-case.mjs
// Checks that every relative import in server/ and client/src/ matches the real
// file/folder names EXACTLY (including upper/lower case). Windows ignores case,
// Linux (Render, Vercel builds) does not, so a mismatch passes locally and
// fails in deployment.
import fs from 'fs';
import path from 'path';

const base = process.cwd();
const roots = ['server', 'client/src'];
const skipDirs = new Set(['node_modules', 'dist', 'backups', '.git']);
const exts = ['', '.js', '.jsx', '.mjs', '.cjs', '.json', '/index.js', '/index.jsx'];
const problems = [];

// True only if every path segment (below the repo root) matches the directory listing exactly.
function existsExactCase(absPath) {
  const rel = path.relative(base, absPath);
  if (rel.startsWith('..')) return true; // outside the repo: not our concern
  let cur = base;
  for (const seg of rel.split(path.sep)) {
    if (!seg) continue;
    let names;
    try { names = fs.readdirSync(cur); } catch { return false; }
    if (!names.includes(seg)) return false;
    cur = path.join(cur, seg);
  }
  return true;
}

function existsIgnoringCase(absPath) {
  return fs.existsSync(absPath);
}

const importRe = /(?:from\s*|import\s*\(?\s*|require\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;

function checkFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(importRe)) {
    const spec = m[1].split('?')[0];
    const target = path.resolve(path.dirname(file), spec);
    const candidates = exts.map((e) => target + e.replace('/', path.sep));
    if (candidates.some(existsExactCase)) continue;
    const kind = candidates.some(existsIgnoringCase) ? 'CASE MISMATCH' : 'NOT FOUND';
    problems.push(`${kind}: ${path.relative(base, file)} -> ${spec}`);
  }
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|jsx|mjs|cjs)$/.test(e.name)) checkFile(p);
  }
}

for (const r of roots) {
  const dir = path.join(base, r);
  if (fs.existsSync(dir)) walk(dir);
  else console.log(`(skipped, not found: ${r})`);
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n` + problems.join('\n'));
  process.exit(1);
}
console.log('OK: all relative imports match file names exactly.');
