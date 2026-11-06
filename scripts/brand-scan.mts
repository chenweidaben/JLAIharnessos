/**
 * 健澜AI原生医院操作系统OS - P5-18 品牌扫描脚本
 *
 * 用法：
 *   bun run scripts/brand-scan.mts [--paths src web/src tests docs] [--words logs/brand-words.txt]
 *
 * 逐文件 fs.readFileSync + String.indexOf(Ordinal) 计数，禁止 regex/grep 数千路径。
 * 输出 {files, totalHits, byWord, byFile}。
 * 分类：硬违规 exit 1；gangos_ backlog 单列；winningSupplierId 类排除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const args = process.argv.slice(2);
function argVals(flag: string, def: string[]): string[] {
  const i = args.indexOf(flag);
  if (i < 0) return def;
  const out: string[] = [];
  for (let j = i + 1; j < args.length; j++) {
    if (args[j].startsWith('--')) break;
    out.push(args[j]);
  }
  return out.length > 0 ? out : def;
}
const paths = argVals('--paths', ['src', 'web/src', 'tests', 'docs']);
const wordsFile = argVals('--words', ['logs/brand-words-reversed.txt'])[0];

const root = resolve(import.meta.dirname ?? process.cwd(), '..');

// 排除项
const BACKLOG_PREFIX = 'gangos_';
const EXCLUDE_WORDS = new Set(['winningSupplierId']);

// 读词表
const allWords = readFileSync(resolve(root, wordsFile), 'utf8')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter((s) => s.length >= 2 && !s.startsWith('#'));

// P5-19: 大小写不敏感（中文不受影响，英文别名 dhc/DHC/bsoft/B-Soft 才吃得下）
const wordsLower = allWords.map((w) => ({ orig: w, lower: w.toLowerCase() }));

console.log(`[brand-scan] paths=${paths.join(',')}`);
console.log(`[brand-scan] words=${wordsLower.length} (case-insensitive, source=${wordsFile})`);

// 收集文件
// 排除构建产物目录（按目录名在任意层级匹配；logs/coverage 不排除，因为 src/ 下可能有真文件）
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.next', 'build']);
const files: string[] = [];
function walk(dir: string): void {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e)) continue;
    const full = join(dir, e);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx|mts|cts|vue|md|json|html|css)$/.test(e)) files.push(full);
  }
}
for (const p of paths) walk(resolve(root, p));

// 扫描
const byWord: Record<string, number> = {};
const byFile: Record<string, Array<{ word: string; count: number }>> = {};
let totalHits = 0;
let backlogHits = 0;
let excludedHits = 0;

for (const f of files) {
  let content: string;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }
  const rel = relative(root, f).replace(/\\/g, '/');
  const hay = content.toLowerCase();
  for (const { orig, lower } of wordsLower) {
    if (EXCLUDE_WORDS.has(orig)) continue;
    let count = 0;
    let idx = hay.indexOf(lower);
    while (idx >= 0) { count++; idx = hay.indexOf(lower, idx + 1); }
    if (count === 0) continue;
    if (orig.startsWith(BACKLOG_PREFIX)) { backlogHits += count; continue; }
    totalHits += count;
    byWord[orig] = (byWord[orig] ?? 0) + count;
    if (!byFile[rel]) byFile[rel] = [];
    byFile[rel].push({ word: orig, count });
  }
  // P5-19: 独立扫 gangos_ 前缀（metric 命名 backlog，不在词表里）
  {
    let count = 0;
    let idx = hay.indexOf(BACKLOG_PREFIX);
    while (idx >= 0) { count++; idx = hay.indexOf(BACKLOG_PREFIX, idx + 1); }
    if (count > 0) {
      backlogHits += count;
      if (!byFile[rel]) byFile[rel] = [];
      byFile[rel].push({ word: BACKLOG_PREFIX + '<prefix>', count });
    }
  }
}

console.log(`[brand-scan] files=${files.length} (skipped dirs: ${[...SKIP_DIRS].join('/')})`);

const report = {
  paths,
  filesScanned: files.length,
  wordsLoaded: allWords.length,
  totalHits,
  backlogGangos: backlogHits,
  excluded: excludedHits,
  byWord,
  byFile,
};
console.log(JSON.stringify(report, null, 2));

process.exit(totalHits > 0 ? 1 : 0);
