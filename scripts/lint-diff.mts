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
import { execFileSync, execSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
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
  // 用 execFileSync 传参数数组：路径含空格/中文时不会被 shell 拆词，
  // 否则 eslint 直接报参数错，脚本会把"跑失败"误算成 0 error（差分门禁 fail-open）。
  try {
    // P5-19: maxBuffer 提到 64MB（server.ts 这种 7000 行文件的 eslint JSON 含 fix 字段可达 4.5MB）
    // 用 'node' 而非 process.execPath：bun 的 execFileSync 对大输出 maxBuffer 不生效（实测 1.9MB 仍截断）
    const out = execFileSync('node', ['node_modules/eslint/bin/eslint.js', ...batch, '-f', 'json'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
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
      } catch (parseErr) {
        // P5-19: 不许静默吞 JSON.parse 失败——stdout 有内容但 parse 不了，说明输出被截断/污染，必须算失败
        totalErrors++;
        errorDetails.push({
          file: '<eslint-run>',
          line: 0,
          message: `eslint JSON parse failed: ${(parseErr as Error).message ?? 'unknown'}`,
          rule: 'lint-run-failure',
        });
      }
    } else {
      // eslint 本身没跑起来（配置错/参数错/找不到文件）：必须算失败，
      // 否则差分门禁会把"跑失败"当成 0 error 静默放行。
      totalErrors++;
      errorDetails.push({
        file: '<eslint-run>',
        line: 0,
        message: (err as Error).message ?? 'eslint failed without JSON output',
        rule: 'lint-run-failure',
      });
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

// 记录基线（每次运行一行，便于追踪差分门禁的历史走势）
const baselineDir = resolve(root, 'logs');
if (!existsSync(baselineDir)) mkdirSync(baselineDir, { recursive: true });
const baselineFile = resolve(baselineDir, 'lint-baseline.jsonl');
appendFileSync(
  baselineFile,
  `${JSON.stringify({ at: new Date().toISOString(), files: files.length, errors: totalErrors, warnings: totalWarnings })}\n`,
  'utf8',
);

process.exit(totalErrors > 0 ? 1 : 0);
