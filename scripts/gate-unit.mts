/**
 * scripts/gate-unit.mts — P5 国密 WORM + 审计单测门禁（清单定义，不执行）
 *
 * 用法：bun run scripts/gate-unit.mts
 *
 * 职责：定义「每次回归跑的是同一批文件」，并打印可直接粘贴执行的命令。
 * 设计取舍：不在脚本内部 spawn `bun test`。
 *   从 bun 进程内 spawn bun，子进程会继承父进程的全局状态，实测造出 41 个假 fail；
 *   改用 execSync 同样被污染。门禁脚本的价值在「清单固定」，不在「一条命令跑完」。
 *
 * 基线（2026-11-06 22:2x 主线 PowerShell 直跑实测，HEAD=bfe8ead0）：
 *   13 文件 = 181 pass / 0 fail / 536 expect
 *
 * 与历史数字的对账（逐文件实测 pass 数，三个口径全部可复算）：
 *   181  - 27（keyOpsStore 10 + auditEventHook 17）= 154   ← 主线早期 11 文件口径
 *   181  - 29（wormKeyProvider）                    = 152   ← 组织侧 12 文件口径
 *   152  - 8（worm-s3-fallback）                    = 144   ← 组织侧 11 文件口径
 * 差异全部来自文件集合本身，0 fail 在三套口径下一致。
 * 差异全部来自文件集合本身，0 fail 在三套口径下一致。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dir, '..');

// P5 国密 WORM + 审计相关单测（按文件显式列举，不 glob）
const FILES: { path: string; pass: number; reason: string }[] = [
  { path: './tests/unit/wormArchive.test.ts',              pass: 0, reason: 'WORM 段归档核心（seal/verify/purge）' },
  { path: './tests/unit/wormKeysRoutes.test.ts',           pass: 0, reason: 'WORM SM2 密钥管理路由' },
  { path: './tests/unit/wormKeyProvider.test.ts',          pass: 29, reason: '密钥提供方（demo-ephemeral / 外部 KMS）' },
  { path: './tests/unit/keyOpsStore.test.ts',              pass: 10, reason: '密钥操作持久化（keyOpsStore）' },
  { path: './tests/unit/auditEventHook.test.ts',           pass: 17, reason: 'auditEventHook after-hook → PgAuditStore' },
  { path: './tests/unit/wormAuditCombo.test.ts',           pass: 0, reason: 'WORM + 审计组合（seal 触发链）' },
  { path: './tests/unit/auditEventStore.test.ts',          pass: 0, reason: 'PgAuditStore（AUDIT_DB_SCHEMA 隔离）' },
  { path: './tests/unit/wormExternalIntegrations.test.ts', pass: 0, reason: 'WORM 外部集成（sm2/sm3/sm4）' },
  { path: './tests/unit/wormStoreResilience.test.ts',      pass: 0, reason: 'WORM store 容错（fs/memory 后端）' },
  { path: './tests/unit/wormLayeredStore.test.ts',         pass: 0, reason: 'WORM 分层存储（local+s3 sweep）' },
  { path: './tests/unit/backfillTruncation.test.ts',       pass: 0, reason: 'backfill 截断 fail-closed' },
  { path: './tests/unit/integration/VendorAdapters.test.ts', pass: 0, reason: '国密厂商适配器（sm-crypto 等）' },
  { path: './tests/integration/worm-s3-fallback.test.ts',  pass: 8,  reason: 'S3 不可用时回退 fs' },
];

const BASELINE = { files: 13, pass: 181, fail: 0, expect: 512 };
// pass 字段只标注「用于对账的独立文件」，未填 0 表示不单独计数（合并跑时由总数体现）

console.log('=== gate-unit: P5 WORM + 审计单测门禁清单（官方 13 文件）===\n');

let anyMissing = false;
for (const f of FILES) {
  const abs = path.join(REPO_ROOT, f.path.replace(/^\.\//, ''));
  const exists = fs.existsSync(abs);
  if (!exists) anyMissing = true;
  console.log(`[${exists ? 'OK' : 'MISSING'}] ${f.path}`);
  console.log(`        ${f.reason}`);
}

if (anyMissing) {
  console.error('\nFAIL: 有文件缺失');
  process.exit(1);
}

console.log('\n=== 执行命令（PowerShell 里 copy 跑，输出重定向到 logs/）===\n');
console.log(`bun test ${FILES.map(f => f.path).join(' ')} *> logs\\unit-$(Get-Date -Format HHmm).log\n`);

console.log('=== 基线（2026-11-06 22:2x 主线直跑实测）===');
console.log(`${BASELINE.files} 文件 / ${BASELINE.pass} pass / ${BASELINE.fail} fail / ${BASELINE.expect} expect`);
console.log('对账：181 − 27(keyOpsStore 10 + auditEventHook 17) = 154；181 − 29(wormKeyProvider) = 152；152 − 8(s3-fallback) = 144');
console.log('\n判定口径：只看 bun test 汇总行 `N pass / N fail / N expect`，不要从正文日志用正则抠数字。');
