import { recordChainAudit } from '../../src/db/repositories/auditChainRepo.js';
import { getDb } from '../../src/db/pool.js';

const sql = getDb();
for (let i = 0; i < 50; i += 1) {
  await recordChainAudit({
    actorId: crypto.randomUUID(),
    actorName: 'serial-check',
    action: 'audit.chain.serial',
    resourceType: 'test',
    resourceId: `s-${i}`,
    detail: {},
  });
}
const broken = await sql`
  WITH scoped AS (
    SELECT seq, prev_hash, COALESCE(lag(hash) OVER (ORDER BY seq), 'GENESIS') AS pe
    FROM audit.audit_logs
  )
  SELECT count(*)::int AS b FROM scoped WHERE prev_hash IS DISTINCT FROM pe
`;
console.log(`SERIAL_BROKEN=${broken[0].b}`);
await sql.end();
