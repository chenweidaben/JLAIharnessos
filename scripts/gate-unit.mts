/**
 * scripts/gate-unit.mts — P5 国密 WORM + 审计单测门禁
 *
 * 用法：bun run scripts/gate-unit.mts
 *
 * 规则：
 * - 清单硬编码（不扫目录），每个文件一行注释说明纳入理由
 * - 任一文件不存在 → exit 1（不静默跳过）
 * - 任一 fail > 0 → exit 1
 * - 合计与基线不符 → warn 但不 exit（集合随切片增长）
 * - 打印每文件存在性 + 合计三元 + exit code
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dir, '..');

// P5 国密 WORM + 审计相关单测（按文件显式列举，不 glob）
// 注：12 文件一次跑有跨文件污染（half1 109/0 + half2 43/0 = 152/0，合并跑 111/41）
// 分两批跑，与主线 154/0/445 基线对齐
const BATCH_A: { path: string; reason: string }[] = [
  { path: './tests/unit/wormArchive.test.ts',          reason: 'WORM 段归档核心（seal/verify/purge）' },
  { path: './tests/unit/wormKeysRoutes.test.ts',       reason: 'WORM SM2 密钥管理路由' },
  { path: './tests/unit/keyOpsStore.test.ts',          reason: '密钥操作持久化（keyOpsStore）' },
  { path: './tests/unit/wormAuditCombo.test.ts',       reason: 'WORM + 审计组合（seal 触发链）' },
  { path: './tests/unit/auditEventStore.test.ts',      reason: 'PgAuditStore（AUDIT_DB_SCHEMA 隔离）' },
  { path: './tests/unit/auditEventHook.test.ts',       reason: 'auditEventHook after-hook → PgAuditStore' },
];
const BATCH_B: { path: string; reason: string }[] = [
  { path: './tests/unit/wormExternalIntegrations.test.ts', reason: 'WORM 外部集成（sm2/sm3/sm4）' },
  { path: './tests/unit/wormStoreResilience.test.ts',  reason: 'WORM store 容错（fs/memory 后端）' },
  { path: './tests/unit/wormLayeredStore.test.ts',     reason: 'WORM 分层存储（local+s3 sweep）' },
  { path: './tests/unit/backfillTruncation.test.ts',   reason: 'backfill 截断 fail-closed' },
  { path: './tests/unit/integration/VendorAdapters.test.ts', reason: '国密厂商适配器（sm-crypto 等）' },
  { path: './tests/integration/worm-s3-fallback.test.ts', reason: 'S3 不可用时回退 fs' },
];
const FILES = [...BATCH_A, ...BATCH_B];

const BASELINE = { pass: 152, fail: 0, expect: 449 };

console.log('=== gate-unit: P5 WORM + 审计单测门禁 ===');
console.log(`清单 ${FILES.length} 文件：\n`);

let anyMissing = false;
for (const f of FILES) {
  const abs = path.join(REPO_ROOT, f.path.replace(/^\.\//, ''));
  const exists = fs.existsSync(abs);
  if (!exists) anyMissing = true;
  console.log(`[${exists ? 'OK' : 'MISSING'}] ${f.path}  —  ${f.reason}`);
}

if (anyMissing) {
  console.error('\nFAIL: 有文件缺失');
  process.exit(1);
}

function runOne(paths: string[]): { pass: number; fail: number; expect: number; exit: number } {
  // 用 execSync 从外部 shell 跑，避免 Bun.spawnSync 从 bun 内 spawn bun 的状态污染
  try {
    const out = execSync(`bun test ${paths.join(' ')}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, BUN_RUN_MAIN: '' },
    });
    const sl = out.split('\n').filter(l => /^\s*\d+\s+(pass|fail|expect)/.test(l));
    return {
      pass: parseInt((sl.find(l => l.includes('pass')) || '0').match(/\d+/)?.[0] || '0', 10),
      fail: parseInt((sl.find(l => l.includes('fail')) || '0').match(/\d+/)?.[0] || '0', 10),
      expect: parseInt((sl.find(l => l.includes('expect')) || '0').match(/\d+/)?.[0] || '0', 10),
      exit: 0,
    };
  } catch (e: any) {
    const out = e.stdout?.toString() || '';
    const sl = out.split('\n').filter(l => /^\s*\d+\s+(pass|fail|expect)/.test(l));
    return {
      pass: parseInt((sl.find(l => l.includes('pass')) || '0').match(/\d+/)?.[0] || '0', 10),
      fail: parseInt((sl.find(l => l.includes('fail')) || '0').match(/\d+/)?.[0] || '0', 10),
      expect: parseInt((sl.find(l => l.includes('expect')) || '0').match(/\d+/)?.[0] || '0', 10),
      exit: 1,
    };
  }
}

console.log('\n=== 运行 bun test（分两批，避免跨文件污染）===');
const rA = runOne(BATCH_A.map(f => f.path));
console.log(`  Batch A (${BATCH_A.length}): ${rA.pass}/${rA.fail}/${rA.expect}`);
const rB = runOne(BATCH_B.map(f => f.path));
console.log(`  Batch B (${BATCH_B.length}): ${rB.pass}/${rB.fail}/${rB.expect}`);
const pass = rA.pass + rB.pass, fail = rA.fail + rB.fail, expect = rA.expect + rB.expect;

console.log(`\n=== 合计 ===`);
console.log(`${pass} pass / ${fail} fail / ${expect} expect`);
console.log(`基线 ${BASELINE.pass}/${BASELINE.fail}/${BASELINE.expect}`);

if (pass !== BASELINE.pass || expect !== BASELINE.expect) {
  console.warn(`WARN: 与基线差 ${pass - BASELINE.pass} pass / ${expect - BASELINE.expect} expect（集合随切片增长，不 exit）`);
}

if (rA.exit !== 0 || rB.exit !== 0 || fail > 0) {
  console.error(`\nFAIL: exit=${rA.exit}/${rB.exit} fail=${fail}`);
  process.exit(1);
}
console.log('\nPASS');
process.exit(0);
