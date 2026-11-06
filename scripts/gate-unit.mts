/**
 * scripts/gate-unit.mts — P5 国密 WORM + 审计单测门禁（清单定义，不执行）
 *
 * 用法：bun run scripts/gate-unit.mts
 *
 * 职责：打印清单 + 完整执行命令。不 spawn bun（避免从 bun 内 spawn bun 的状态污染）。
 * 在 PowerShell 里 copy 执行输出的命令，贴结果对基线。
 *
 * 基线（P5-20 实测，PowerShell 直跑）：
 *   11 文件 = 144 pass / 0 fail / 429 expect
 *   12 文件（含 s3-fallback）= 152 pass / 0 fail / 449 expect
 *   主线报 154 / 0 / 445（差 2 pass，集合边界）
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dir, '..');

// P5 国密 WORM + 审计相关单测（按文件显式列举，不 glob）
const FILES: { path: string; reason: string }[] = [
  { path: './tests/unit/wormArchive.test.ts',             reason: 'WORM 段归档核心（seal/verify/purge）' },
  { path: './tests/unit/wormKeysRoutes.test.ts',          reason: 'WORM SM2 密钥管理路由' },
  { path: './tests/unit/keyOpsStore.test.ts',             reason: '密钥操作持久化（keyOpsStore）' },
  { path: './tests/unit/wormAuditCombo.test.ts',         reason: 'WORM + 审计组合（seal 触发链）' },
  { path: './tests/unit/auditEventStore.test.ts',         reason: 'PgAuditStore（AUDIT_DB_SCHEMA 隔离）' },
  { path: './tests/unit/auditEventHook.test.ts',          reason: 'auditEventHook after-hook → PgAuditStore' },
  { path: './tests/unit/wormExternalIntegrations.test.ts', reason: 'WORM 外部集成（sm2/sm3/sm4）' },
  { path: './tests/unit/wormStoreResilience.test.ts',     reason: 'WORM store 容错（fs/memory 后端）' },
  { path: './tests/unit/wormLayeredStore.test.ts',       reason: 'WORM 分层存储（local+s3 sweep）' },
  { path: './tests/unit/backfillTruncation.test.ts',      reason: 'backfill 截断 fail-closed' },
  { path: './tests/unit/integration/VendorAdapters.test.ts', reason: '国密厂商适配器（sm-crypto 等）' },
  { path: './tests/integration/worm-s3-fallback.test.ts', reason: 'S3 不可用时回退 fs（可选追加）' },
];

const BASELINE = { pass: 152, fail: 0, expect: 449 };

console.log('=== gate-unit: P5 WORM + 审计单测门禁清单 ===\n');

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

console.log(`\n=== 执行命令（PowerShell 里 copy 跑）===\n`);
console.log(`bun test ${FILES.map(f => f.path).join(' ')}\n`);

console.log(`=== 基线（PowerShell 直跑实测）===`);
console.log(`${BASELINE.pass} pass / ${BASELINE.fail} fail / ${BASELINE.expect} expect`);
console.log(`主线报 154 / 0 / 445（差 2 pass，集合边界，0 fail 一致）`);
console.log(`\n跑完贴三元数字对比。fail > 0 才是真失败。`);
