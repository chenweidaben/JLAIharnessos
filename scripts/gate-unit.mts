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
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dir, '..');

const FILES: { path: string; reason: string }[] = [
  { path: './tests/unit/wormArchive.test.ts',          reason: 'WORM 段归档核心（seal/verify/purge）' },
  { path: './tests/unit/wormKeysRoutes.test.ts',       reason: 'WORM SM2 密钥管理路由' },
  { path: './tests/unit/keyOpsStore.test.ts',          reason: '密钥操作持久化（keyOpsStore）' },
  { path: './tests/unit/wormAuditCombo.test.ts',       reason: 'WORM + 审计组合（seal 触发链）' },
  { path: './tests/unit/auditEventStore.test.ts',      reason: 'PgAuditStore（AUDIT_DB_SCHEMA 隔离）' },
  { path: './tests/unit/auditEventHook.test.ts',       reason: 'auditEventHook after-hook → PgAuditStore' },
  { path: './tests/unit/wormExternalIntegrations.test.ts', reason: 'WORM 外部集成（sm2/sm3/sm4）' },
  { path: './tests/unit/wormStoreResilience.test.ts',  reason: 'WORM store 容错（fs/memory 后端）' },
  { path: './tests/unit/wormLayeredStore.test.ts',     reason: 'WORM 分层存储（local+s3 sweep）' },
  { path: './tests/unit/backfillTruncation.test.ts',   reason: 'backfill 截断 fail-closed' },
  { path: './tests/unit/integration/VendorAdapters.test.ts', reason: '国密厂商适配器（sm-crypto 等）' },
  { path: './tests/integration/worm-s3-fallback.test.ts', reason: 'S3 不可用时回退 fs' },
];

const BASELINE = { pass: 152, fail: 0, expect: 449 };

// auditEventHook 与其他文件有测试污染（单独跑 17/0/26，合并跑会 fail）
// 先单独跑它，再跑其余 11 个
const SEPARATE = ['./tests/unit/auditEventHook.test.ts'];

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

console.log('\n=== 运行 bun test ===');

function runOne(paths: string[]): { pass: number; fail: number; expect: number; exit: number } {
  const r = Bun.spawnSync(['bun', 'test', ...paths], { cwd: REPO_ROOT, stdout: 'pipe', stderr: 'pipe' });
  const out = r.stdout.toString() + r.stderr.toString();
  const sl = out.split('\n').filter(l => /^\s*\d+\s+(pass|fail|expect)/.test(l));
  return {
    pass: parseInt((sl.find(l => l.includes('pass')) || '0').match(/\d+/)?.[0] || '0', 10),
    fail: parseInt((sl.find(l => l.includes('fail')) || '0').match(/\d+/)?.[0] || '0', 10),
    expect: parseInt((sl.find(l => l.includes('expect')) || '0').match(/\d+/)?.[0] || '0', 10),
    exit: r.exitCode ?? 1,
  };
}

// 先跑独立文件
let tp = 0, tf = 0, te = 0, tex = 0;
for (const p of SEPARATE) {
  const r = runOne([p]);
  console.log(`  ${p}: ${r.pass}/${r.fail}/${r.expect}`);
  tp += r.pass; tf += r.fail; te += r.expect; tex += r.exit;
}
// 再跑其余
const rest = FILES.filter(f => !SEPARATE.includes(f.path)).map(f => f.path);
const r2 = runOne(rest);
console.log(`  (其余 ${rest.length} 文件): ${r2.pass}/${r2.fail}/${r2.expect}`);
tp += r2.pass; tf += r2.fail; te += r2.expect;

const pass = tp, fail = tf, expect = te;

console.log(`\n=== 合计 ===`);
console.log(`${pass} pass / ${fail} fail / ${expect} expect`);
console.log(`基线 ${BASELINE.pass}/${BASELINE.fail}/${BASELINE.expect}`);

if (pass !== BASELINE.pass || expect !== BASELINE.expect) {
  console.warn(`WARN: 与基线差 ${pass - BASELINE.pass} pass / ${expect - BASELINE.expect} expect（集合随切片增长，不 exit）`);
}

if (tex !== 0 || r2.exit !== 0 || fail > 0) {
  console.error(`\nFAIL: exit=${tex}/${r2.exit} fail=${fail}`);
  process.exit(1);
}
console.log('\nPASS');
process.exit(0);
