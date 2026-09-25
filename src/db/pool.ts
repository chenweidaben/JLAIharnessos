/**
 * 健澜科技数智医院智能体 - PostgreSQL 连接池
 *
 * 基于 postgres.js（轻量、零依赖、Bun 友好）。
 * 由于 postgres.js 的泛型类型极其严格，本模块在边界使用宽松类型，
 * 由上层 Repository 提供强类型保证。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import postgres from 'postgres';

/** 宽松的 SQL 执行器类型（兼容 Pool / Transaction / Client） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Sql = postgres.Sql<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransactionSql = postgres.TransactionSql<any>;
/**
 * 事务/连接池通用执行器（postgres.ISql：模板查询 + unsafe + json）。
 * Sql 与 TransactionSql 均兼容该类型，便于 Repository 在事务内外复用，
 * 同时保证事务句柄（TransactionSql）可类型安全地传入。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbExecutor = postgres.ISql<any>;

let _sql: Sql | null = null;
let _shuttingDown = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClient(): Sql {
  const url = process.env.DATABASE_URL;
  const max = Number(process.env.PG_POOL_MAX ?? 20);
  const idleTimeout = Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30_000);
  const connectTimeout = Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 10_000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base: postgres.Options<any> = {
    max,
    idle_timeout: Math.floor(idleTimeout / 1000),
    connect_timeout: Math.floor(connectTimeout / 1000),
    ssl: process.env.PGSSLMODE === 'disable' ? false : process.env.NODE_ENV === 'production',
    transform: { undefined: null },
  };

  // 关键：连接串必须作为 postgres() 的第一个位置参数传入；
  // 若把 url 放进 options 对象，postgres.js 会忽略它，退连默认 localhost:5432。
  if (url) {
    return postgres(url, base);
  }
  return postgres({
    ...base,
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE ?? 'jlmedaios',
    username: process.env.PGUSER ?? 'postgres',
    password: process.env.PGPASSWORD ?? 'postgres',
  });
}

export function getDb(): Sql {
  if (_sql) return _sql;
  if (_shuttingDown) throw new Error('[db] 系统正在关闭，拒绝新建数据库连接');
  _sql = createClient();
  return _sql;
}

export async function verifyDbConnection(retries = 3, intervalMs = 1500): Promise<void> {
  const sql = getDb();
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sql`SELECT 1 AS ok`;
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  const hint = [
    '[db] 无法连接 PostgreSQL，请检查：',
    '  1. DATABASE_URL 环境变量是否正确（或 PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD）',
    '  2. Postgres 服务是否已启动（docker compose up -d postgres）',
    '  3. 本地开发可设置 PGSSLMODE=disable 关闭 SSL',
    '  4. 演示模式可设置 DEMO_MODE=1 跳过 DB 依赖（仅用于无 DB 演示，数据不持久化）',
  ].join('\n');
  throw new Error(`${hint}\n原始错误: ${String(lastErr)}`);
}

export async function withTx<T>(fn: (tx: TransactionSql) => Promise<T>): Promise<T> {
  const sql = getDb();
  return sql.begin(fn) as Promise<T>;
}

export async function closeDb(): Promise<void> {
  _shuttingDown = true;
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
  }
}

export function _resetDbForTest(): void {
  _sql = null;
  _shuttingDown = false;
}

/**
 * 测试专用：优雅关闭当前连接池，但不泄漏"系统正在关闭"的全局状态。
 *
 * 背景：bun test 默认在同一进程内顺序执行多个测试文件。若测试在 afterAll
 * 调用生产语义的 closeDb()，模块级 _shuttingDown 会被永久置真，导致同进程
 * 后续所有打库测试报"系统正在关闭，拒绝新建连接"。本函数结束物理连接
 * （避免句柄泄漏/进程悬挂），同时重置关闭标志，使后续测试可重新建池。
 */
export async function closeDbForTest(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
  }
  _shuttingDown = false;
}
