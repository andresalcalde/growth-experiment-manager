// Compare changed TypeScript files with HEAD; line shifts do not create findings.
import { ESLint } from 'eslint';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const paths = [...new Set([
  ...git(['diff', '--name-only', 'HEAD']).trim().split('\n'),
  ...git(['ls-files', '--others', '--exclude-standard']).trim().split('\n'),
])].filter(path => /\.tsx?$/.test(path));
const eslint = new ESLint();
const counts = results => {
  const map = new Map();
  for (const result of results) for (const { ruleId, severity, message } of result.messages) {
    const diagnostic = message.replace(/\n\n(?:[A-Za-z]:[\\/]|\/)[\s\S]*$/, '');
    const key = JSON.stringify([ruleId, severity, diagnostic]);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
};
let previousErrors = 0, currentErrors = 0, added = 0;
for (const path of paths) {
  let base = '';
  try { base = git(['show', `HEAD:${path}`]); } catch { /* New file. */ }
  const previous = await eslint.lintText(base, { filePath: path });
  const current = await eslint.lintText(await readFile(path, 'utf8'), { filePath: path });
  const oldCounts = counts(previous);
  for (const [key, count] of counts(current)) if (count > (oldCounts.get(key) || 0)) {
    added += count - (oldCounts.get(key) || 0);
    console.error(`NEW ${path}: ${key} x${count - (oldCounts.get(key) || 0)}`);
  }
  previousErrors += previous.reduce((sum, result) => sum + result.errorCount, 0);
  currentErrors += current.reduce((sum, result) => sum + result.errorCount, 0);
}
console.log(`${paths.length} archivos TS: base ${previousErrors} errores; actual ${currentErrors}; ${added} diagnósticos nuevos.`);
if (added) process.exitCode = 1;
