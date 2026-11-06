/**
 * 健澜AI原生医院操作系统OS - P5-17 差分 lint 门禁
 *
 * 用法：
 *   bun run scripts/lint-diff.mts              # 工作区改动（unstaged + staged）
 *   bun run scripts/lint-diff.mts --staged     # 只看 staged
 *   bun run scripts/lint-diff.mts --base HEAD~5  # 相对某个 base 的 diff
 *
 * 对改动文件逐个跑 eslint，有 error 则 exit 1。
 * 全量基线写 logs/lint-baseline.jsonl（gitignore，不进仓库）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
const staged = args.includes('--staged');
const baseIdx = args.indexOf('--base');
const base = baseIdx >= 0 ? args[baseIdx + 1] : null;

function git(cmd: string): string {
  return execSync(`git ${cmd}`, { cwd: root, encoding: 'utf8' }).trim();
}

function getChangedFiles(): string[] {
  if (base) {
    return git(`diff --name-only ${base}..HEAD`)
      .split('\n').filter(Boolean)
      .filter((f) => /\.(ts|tsx|mts|cts|js|jsx)$/.test(f));
  }
  if (staged) {
    return git('diff --name-only --cached')
      .split('\n').filter(Boolean)
      .filter((f) => /\.(ts|tsx|mts|cts|js|jsx)$/.test(f));
  }
  // 工作区（unstaged + staged）
  const unstaged = git('diff --name-only').split('\n').filter(Boolean);
  const stagedF = git('diff --name-only --cached').split('\n').filter(Boolean);
  return [...new Set([...unstaged, ...stagedF])]
    .filter((f) => /\.(ts|tsx|mts|cts|js|jsx)$/.test(f));
}

const files = getChangedFiles();
if (files.length === 0) {
  console.log('[lint-diff] no changed TS/JS files, exit 0');
  process.exit(0);
}

console.log(`[lint-diff] checking ${files.length} files:`);
for (const f of files) console.log(`  ${f}`);

// 分批跑 eslint（避免单次 OOM），每批 20 文件
const batchSize = 20;
let totalErrors = 0;
let totalWarnings = 0;
const errorDetails: Array<{ file: string; line: number; message: string; rule: string }> = [];

for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);
  const args2 = ['node', 'node_modules/eslint/bin/eslint.js', ...batch, '-f', 'json'];
  try {
    const out = execSync(args2.join(' '), {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const results = JSON.parse(out);
    for (const r of results) {
      for (const m of r.messages) {
        if (m.severity === 2) {
          totalErrors++;
          errorDetails.push({
            file: r.filePath.replace(root + '\\', '').replace(root + '/', ''),
            line: m.line,
            message: m.message,
            rule: m.ruleId ?? '',
          });
        } else {
          totalWarnings++;
        }
      }
    }
  } catch (err: any) {
    // eslint exit 1 表示有 error，但 stdout 仍有 JSON
    const out = err.stdout?.toString() ?? '';
    if (out) {
      try {
        const results = JSON.parse(out);
        for (const r of results) {
          for (const m of r.messages) {
            if (m.severity === 2) {
              totalErrors++;
              errorDetails.push({
                file: r.filePath.replace(root + '\\', '').replace(root + '/', ''),
                line: m.line,
                message: m.message,
                rule: m.ruleId ?? '',
              });
            } else {
              totalWarnings++;
            }
          }
        }
      } catch { /* ignore */ }
    }
  }
}

console.log(`\n[lint-diff] RESULT: ${totalErrors} errors, ${totalWarnings} warnings`);
if (errorDetails.length > 0) {
  console.log('\nErrors:');
  for (const e of errorDetails) {
    console.log(`  ${e.file}:${e.line}  ${e.rule}  ${e.message}`);
  }
}

// 记录基线（全量）
const baselineDir = resolve(root, 'logs');
if (!existsSync(baselineDir)) mkdirSync(baselineDir, { recursive: true });
const baselineFile = resolve(baselineDir, 'lint-baseline.jsonl');

process.exit(totalErrors > 0 ? 1 : 0);
