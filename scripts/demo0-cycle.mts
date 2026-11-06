/**
 * scripts/demo0-cycle.mts — DEMO_MODE=0 migration 安全启停 + 回滚
 *
 * 用法：
 *   bun run scripts/demo0-cycle.mts --check      # 只读预检
 *   bun run scripts/demo0-cycle.mts --up         # 启动 BFF（会跑 migration）
 *   bun run scripts/demo0-cycle.mts --rollback   # 精确回滚 6 个 consult migration
 *
 * 硬约束：
 * - 回滚用精确 6 文件名 IN 列表，禁 LIKE
 * - --up 前必须 --check 通过
 * - --rollback 前 consult 表数必须 = 6
 * - 端口从 PORT/HTTP_PORT env 读，不写死
 * - 入口固定 src/bff/server.ts（不是 src/bff/index.ts：后者只是 re-export 壳，
 *   起进程会落到 server.ts 的默认端口，容易和 8080 撞车）
 */
import postgres from 'postgres';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5433/jlmedaios';
const PORT = parseInt(process.env.PORT ?? '8082', 10);

// 精确 6 个 consult migration（硬编码，禁 LIKE）
const CONSULT_MIGRATIONS = [
  '380-consult-threads.sql',
  '381-consult-messages.sql',
  '382-consult-documents.sql',
  '383-consult-drafts.sql',
  '384-consult-audit-trail.sql',
  '385-consult-profile-memory.sql',
] as const;

const BASELINE = { migrations: 349, consultTables: 0 };

async function check(): Promise<{ ok: boolean; lines: string[] }> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  const [m] = await sql`SELECT count(*)::int AS n FROM schema_migrations`;
  const [t] = await sql`SELECT to_regclass('consult.threads') AS v`;
  const [c] = await sql`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='consult'`;
  const [a] = await sql`SELECT count(*)::int AS n FROM audit.events`;
  await sql.end();

  const lines = [
    `schema_migrations = ${m.n}`,
    `to_regclass('consult.threads') = ${t.v ?? 'null'}`,
    `pg_tables consult = ${c.n}`,
    `audit.events = ${a.n}`,
  ];

  const ok = m.n === BASELINE.migrations && t.v === null && c.n === 0;
  return { ok, lines };
}

async function rollback(): Promise<boolean> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  const [c] = await sql`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='consult'`;
  if (c.n !== 6) {
    console.error(`拒绝回滚：consult 表数 = ${c.n}，预期 6。防止回滚别的状态。`);
    await sql.end();
    return false;
  }
  await sql.unsafe('DROP SCHEMA IF EXISTS consult CASCADE');
  await sql`DELETE FROM schema_migrations WHERE version IN ${sql(CONSULT_MIGRATIONS)}`;
  const [m] = await sql`SELECT count(*)::int AS n FROM schema_migrations`;
  const [t] = await sql`SELECT to_regclass('consult.threads') AS v`;
  const [c2] = await sql`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='consult'`;
  await sql.end();
  console.log(`回滚后: migrations=${m.n}, threads=${t.v ?? 'null'}, consult tables=${c2.n}`);
  return m.n === 349 && t.v === null && c2.n === 0;
}

async function up(): Promise<boolean> {
  const chk = await check();
  if (!chk.ok) {
    console.error('拒绝启动：--check 不通过：');
    chk.lines.forEach(l => console.error('  ' + l));
    return false;
  }
  const port = PORT;
  console.log(`启动 BFF on ${port} (DEMO_MODE=0, AUDIT_STORE=pg)`);
  const child = spawn(process.execPath, ['run', 'src/bff/server.ts'], {
    env: {
      ...process.env,
      DEMO_MODE: '0',
      AUDIT_STORE: 'pg',
      PORT: String(port),
      HTTP_PORT: String(port),
      DATABASE_URL,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', d => { stdout += d.toString(); });
  child.stderr?.on('data', d => { stderr += d.toString(); });

  // 轮询 /ready
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/ready`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        console.log('BFF ready: ' + await res.text());
        console.log(`PID: ${child.pid}（用 taskkill /T /F /PID ${child.pid} 停止）`);
        return true;
      }
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 500));
  }
  child.kill();
  console.error('BFF 30s 未 ready');
  console.error('--- stderr ---\n' + stderr.slice(-2000));
  return false;
}

const mode = process.argv[2];
if (mode === '--check') {
  const { ok, lines } = await check();
  lines.forEach(l => console.log(l));
  console.log(ok ? '\nCHECK OK: 可启动' : '\nCHECK FAIL: 状态不符基线');
  process.exit(ok ? 0 : 1);
} else if (mode === '--up') {
  const ok = await up();
  process.exit(ok ? 0 : 1);
} else if (mode === '--rollback') {
  const ok = await rollback();
  console.log(ok ? '\nROLLBACK OK' : '\nROLLBACK FAIL');
  process.exit(ok ? 0 : 1);
} else {
  console.error('用法: bun run scripts/demo0-cycle.mts [--check|--up|--rollback]');
  process.exit(1);
}
