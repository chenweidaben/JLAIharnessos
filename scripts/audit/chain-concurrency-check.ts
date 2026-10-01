/**
 * 审计哈希链并发完整性回归验证（迁移 68 + recordChainAudit 重试）
 * 10 连接 × 各 20 条并发经 recordChainAudit 写入，然后校验整链 0 断裂。
 * 通过唯一约束 + 链头行锁 + 自动重试，最终链必须完整。
 */
import { recordChainAudit } from '../../src/db/repositories/auditChainRepo.js';
import { getDb } from '../../src/db/pool.js';

const sql = getDb();
const CONCURRENCY = 10;
const PER_CONN = 20;
const RUNS = 3; // 多轮以放大并发窗口

for (let round = 0; round < RUNS; round += 1) {
  const workers = Array.from({ length: CONCURRENCY }, (_, w) =>
    (async () => {
      for (let k = 0; k < PER_CONN; k += 1) {
        await recordChainAudit({
          actorId: crypto.randomUUID(),
          actorName: 'concurrency-check',
          action: 'audit.chain.stress',
          resourceType: 'test',
          resourceId: `stress-${round}-${w}-${k}`,
          detail: {},
        });
      }
    })(),
  );
  await Promise.all(workers);
}

const total = await sql`SELECT count(*)::int AS total FROM audit.audit_logs`;

const broken = await sql`
  WITH scoped AS (
    SELECT seq, prev_hash,
           COALESCE(lag(hash) OVER (ORDER BY seq), 'GENESIS') AS prev_expected
    FROM audit.audit_logs
  )
  SELECT count(*)::int AS broken FROM scoped
  WHERE prev_expected IS DISTINCT FROM prev_hash
`;

console.log(`TOTAL=${total[0].total} BROKEN=${broken[0].broken}`);
if (broken[0].broken !== 0) {
  console.error('FAIL: audit chain broken under concurrency');
  process.exit(1);
}
console.log(`PASS: chain intact after ${CONCURRENCY * PER_CONN * RUNS} concurrent writes`);
await sql.end();
