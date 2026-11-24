/**
 * 健澜AI原生医院操作系统OS - 审计事件存储端口（P5-13）
 *
 * 存储可插拔：
 *  - MemoryAuditStore：单测/显式 AUDIT_STORE=memory，进程内存
 *  - PgAuditStore：生产，走 postgres.js 模板标签，advisory lock 保证 seq 严格连续
 *
 * 选型规则（DEMO_MODE 不参与判定，避免运行态假绿）：
 *  - NODE_ENV=test            → Memory
 *  - AUDIT_STORE=memory       → Memory（显式降级唯一入口）
 *  - NODE_ENV=production      → 必须 Pg，连不上启动失败
 *  - 其他                     → DATABASE_URL 可连则 Pg，否则 Memory + 警告
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AuditEvent } from './auditEventAggregator';

/**
 * postgres.js 最小类型形态：只声明本文件用到的几个调用。
 * 模板标签返回任意行数组；调用点再收窄到具体 Row 类型，避免 any 泛滥。
 */
export interface CursorableQuery<T> extends Promise<T[]> {
  cursor(rows?: number): AsyncIterableIterator<T[]>;
}
export interface PgSql {
  <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): CursorableQuery<T>;
  begin<T>(fn: (tx: PgSql) => Promise<T>): Promise<T>;
  /** 原样片段（用于动态标识符/条件片段，调用前必须自行完成白名单校验） */
  unsafe(fragment: string, args?: unknown[], options?: unknown): unknown;
}
// 向后兼容别名
export type SqlExecutor = PgSql;

export interface AppendResult {
  ok: boolean;
  persisted: boolean;
  /** Pg 路径返回 DB 实际分配的 seq；Memory 路径返回内存分配的 seq。 */
  seq?: number;
  fallbackPath?: string;
  reason?: string;
}

export interface AuditEventStore {
  readonly kind: 'memory' | 'pg';
  append(evt: AuditEvent): Promise<AppendResult>;
  maxSeq(): Promise<number>;
  /** 分页查询（DB 分页 + count，所有过滤进 WHERE） */
  query(opts: {
    limit: number; offset: number;
    actorId?: string; module?: string; action?: string; result?: string; patientId?: string;
    from?: string; to?: string;
  }): Promise<{ rows: AuditEvent[]; total: number }>;
  /** 流式读全量（verifyChain 用，按 seq 升序） */
  streamAll(): AsyncIterable<AuditEvent[]>;
  /** 启动回填：把 seq > fromSeq 的事件灌回 pending（仅 Pg 有意义） */
  backfill(fromSeq: number, limit?: number): Promise<AuditEvent[]>;
  /** 统计 seq > fromSeq 的事件总数（backfill 截断检测用） */
  countAfter(fromSeq: number): Promise<number>;
  /** P5-26: 轻量连通性探测，2s 超时；memory 永远 true */
  ping(): Promise<boolean>;
}

// ---- 计数器（运行态 /metrics 暴露） ----
let persistFailedTotal = 0;
export function auditPersistFailedTotal(): number { return persistFailedTotal; }
export function __resetAuditMetrics(): void { persistFailedTotal = 0; }

function fallbackFile(): string {
  const dir = process.env.AUDIT_FALLBACK_DIR ?? join(process.cwd(), 'logs');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  return join(dir, `audit-fallback-${date}.jsonl`);
}

function writeFallback(evt: AuditEvent): string | null {
  try {
    const p = fallbackFile();
    appendFileSync(p, JSON.stringify(evt) + '\n', 'utf8');
    return p;
  } catch {
    return null;
  }
}

function incPersistFailed(): void {
  persistFailedTotal += 1;
  try {
    // 延迟 require 避免循环依赖（metrics → server → auditEventStore）
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../observability/metrics') as { bffMetrics: { auditPersistFailed: { inc(labels?: unknown, v?: number): void } } };
    mod.bffMetrics.auditPersistFailed.inc();
  } catch { /* metrics 未就绪不阻塞 */ }
}

// ---- Memory ----
export class MemoryAuditStore implements AuditEventStore {
  readonly kind = 'memory' as const;
  private rows: AuditEvent[] = [];

  async append(evt: AuditEvent): Promise<AppendResult> {
    const seq = this.rows.length + 1;
    this.rows.push({ ...evt, seq });
    return { ok: true, persisted: true, seq };
  }
  async maxSeq(): Promise<number> {
    return this.rows.length;
  }
  async query(opts: { limit: number; offset: number }): Promise<{ rows: AuditEvent[]; total: number }> {
    // Memory 实现：返回全量（路由层做过滤+分页），保证单测语义与 Pg 一致
    const sorted = [...this.rows].sort((a, b) => b.seq - a.seq);
    return { rows: sorted, total: sorted.length };
  }
  async *streamAll(): AsyncIterable<AuditEvent[]> {
    const sorted = [...this.rows].sort((a, b) => a.seq - b.seq);
    for (let i = 0; i < sorted.length; i += 500) {
      yield sorted.slice(i, i + 500);
    }
  }
  async backfill(fromSeq: number, limit = 1000): Promise<AuditEvent[]> {
    // Memory 实现：返回 seq > fromSeq 的行（供单测验证回填边界）
    return this.rows
      .filter((e) => e.seq > fromSeq)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, limit);
  }
  async countAfter(fromSeq: number): Promise<number> {
    return this.rows.filter((e) => e.seq > fromSeq).length;
  }
  all(): AuditEvent[] { return this.rows; }
  reset(): void { this.rows = []; }
  async ping(): Promise<boolean> { return true; }
}

// ---- Pg ----
interface EventsRow {
  seq: string | number;
  event_id: string;
  occurred_at: string;
  actor_id: string;
  actor_role: string;
  action: string;
  module: string;
  resource_type: string;
  resource_id: string;
  patient_id: string | null;
  result: string;
  error_code: string | null;
  ip: string;
  user_agent: string;
  prev_hash: string;
  hash: string;
  tenant_id: string | null;
}

function rowFromDb(r: EventsRow): AuditEvent {
  return {
    eventId: r.event_id, seq: Number(r.seq), occurredAt: r.occurred_at,
    actorId: r.actor_id, actorRole: r.actor_role as AuditEvent['actorRole'],
    action: r.action as AuditEvent['action'], module: r.module,
    resourceType: r.resource_type, resourceId: r.resource_id,
    patientId: r.patient_id ?? undefined, result: r.result as AuditEvent['result'],
    errorCode: r.error_code ?? undefined, ip: r.ip, userAgent: r.user_agent,
    prevHash: r.prev_hash, hash: r.hash,
  };
}

export class PgAuditStore implements AuditEventStore {
  readonly kind = 'pg' as const;
  private readonly qualifiedTable: ReturnType<PgSql>;
  /** 白名单校验后的安全标识符字符串，供整条 unsafe 查询拼接表名 */
  private readonly tableName: string;
  private readonly lockKey: string;
  constructor(private readonly sql: SqlExecutor, schema?: string) {
    // P5-20: AUDIT_DB_SCHEMA 隔离（默认 'audit'，E2E 用 'audit_e2e'）
    const s = schema ?? process.env.AUDIT_DB_SCHEMA ?? 'audit';
    if (!/^[a-z_][a-z0-9_]*$/.test(s)) {
      throw new Error(`AUDIT_DB_SCHEMA invalid: ${s} (must match ^[a-z_][a-z0-9_]*$)`);
    }
    // 白名单已校验，安全内联为标识符
    this.tableName = `"${s}"."events"`;
    this.qualifiedTable = this.sql.unsafe(this.tableName) as ReturnType<PgSql>;
    // P5-20 第二步：lock key 参数化，两 schema 不互相阻塞
    this.lockKey = `audit_events_seq_${s}`;
  }

  async append(evt: AuditEvent): Promise<AppendResult> {
    try {
      // 事务内拿 advisory lock，锁在 COMMIT 时自动释放。
      // 锁内只做：取 MAX(seq)+1 + INSERT，不做 SM3、不写文件、不查别的表。
      let assignedSeq = 0;
      await this.sql.begin(async (tx) => {
        const rows = await tx<{ seq: string | number }>`
          WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${this.lockKey}))),
               nxt AS (SELECT COALESCE(MAX(seq),0)+1 AS seq FROM ${this.qualifiedTable}, lock)
          INSERT INTO ${this.qualifiedTable}
            (seq, event_id, occurred_at, actor_id, actor_role, action, module,
             resource_type, resource_id, patient_id, result, error_code, ip, user_agent,
             prev_hash, hash)
          SELECT nxt.seq, ${evt.eventId}, ${evt.occurredAt}, ${evt.actorId}, ${evt.actorRole},
                 ${evt.action}, ${evt.module}, ${evt.resourceType}, ${evt.resourceId},
                 ${evt.patientId ?? null}, ${evt.result}, ${evt.errorCode ?? null},
                 ${evt.ip}, ${evt.userAgent}, ${evt.prevHash}, ${evt.hash}
          FROM nxt
          RETURNING seq
        `;
        assignedSeq = Number(rows[0]?.seq ?? 0);
      });
      return { ok: true, persisted: true, seq: assignedSeq };
    } catch (err) {
      incPersistFailed();
      const reason = err instanceof Error ? err.message : String(err);
      const fb = writeFallback(evt);
      if (fb) {
        console.error(`[audit] pg append failed, fallback ok: ${reason}`);
        return { ok: true, persisted: false, fallbackPath: fb, reason };
      }
      console.error(`[audit] pg append AND fallback both failed: ${reason}`);
      return { ok: false, persisted: false, reason };
    }
  }

  async maxSeq(): Promise<number> {
    const rows = await this.sql<{ max: string | number }>`SELECT COALESCE(MAX(seq),0)::bigint AS max FROM ${this.qualifiedTable}`;
    return Number(rows[0]?.max ?? 0);
  }

  async query(opts: {
    limit: number; offset: number;
    actorId?: string; module?: string; action?: string; result?: string; patientId?: string;
    from?: string; to?: string;
  }): Promise<{ rows: AuditEvent[]; total: number }> {
    // 所有过滤进 WHERE；total 用单独 count(*) 走同一 WHERE。
    // postgres.js 3.4.x 连接池实例未挂载 sql.join，这里列名固定白名单、
    // 值一律走 $n 参数占位，条件片段用 unsafe 内联（与仓内 QueryBuilder 同构）。
    const params: unknown[] = [];
    const conds: string[] = [];
    const eq = (col: string, val: unknown) => { params.push(val); conds.push(`${col} = $${params.length}`); };
    const cmp = (col: string, op: string, val: unknown) => { params.push(val); conds.push(`${col} ${op} $${params.length}`); };
    if (opts.actorId) eq('actor_id', opts.actorId);
    if (opts.module) eq('module', opts.module);
    if (opts.action) eq('action', opts.action);
    if (opts.result) eq('result', opts.result);
    if (opts.patientId) eq('patient_id', opts.patientId);
    if (opts.from) cmp('occurred_at', '>=', opts.from);
    if (opts.to) cmp('occurred_at', '<=', opts.to);

    const whereClause = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    // 整条语句 + 参数数组交给 unsafe 绑定；带参片段嵌模板不会合并 args，
    // 会报 "bind message supplies 0 parameters"。表名是白名单校验过的标识符。
    const totalRows = await this.sql.unsafe(
      `SELECT COUNT(*)::bigint AS count FROM ${this.tableName} ${whereClause}`,
      params,
    ) as { count: string | number }[];
    const total = Number(totalRows[0]?.count ?? 0);

    const rows = await this.sql.unsafe(
      `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY seq DESC LIMIT ${opts.limit} OFFSET ${opts.offset}`,
      params,
    ) as EventsRow[];
    return { rows: rows.map(rowFromDb), total };
  }

  async *streamAll(): AsyncIterable<AuditEvent[]> {
    // postgres.js 3.4.x：cursor 是 Query 实例方法（sql`…`.cursor(rows)），
    // 并非 sql.cursor(rows) 顶层方法；每 500 条一批异步迭代。
    const query = this.sql<EventsRow>`SELECT * FROM ${this.qualifiedTable} ORDER BY seq ASC`;
    for await (const batch of query.cursor(500)) {
      yield batch.map(rowFromDb);
    }
  }

  async backfill(fromSeq: number, limit = 1000): Promise<AuditEvent[]> {
    const rows = await this.sql<EventsRow>`
      SELECT * FROM ${this.qualifiedTable} WHERE seq > ${fromSeq} ORDER BY seq ASC LIMIT ${limit}
    `;
    return rows.map(rowFromDb);
  }

  async countAfter(fromSeq: number): Promise<number> {
    const r = await this.sql<{ n: string | number }>`SELECT count(*)::bigint AS n FROM ${this.qualifiedTable} WHERE seq > ${fromSeq}`;
    return Number(r[0]?.n ?? 0);
  }

  async ping(): Promise<boolean> {
    try {
      await Promise.race([
        this.sql`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), 2000)),
      ]);
      return true;
    } catch {
      return false;
    }
  }
}

// ---- 工厂 ----
let globalStore: AuditEventStore | null = null;

export function getAuditStore(): AuditEventStore {
  if (globalStore) return globalStore;
  const nodeEnv = process.env.NODE_ENV ?? '';
  const auditStoreEnv = process.env.AUDIT_STORE ?? '';

  if (auditStoreEnv === 'memory' || nodeEnv === 'test') {
    globalStore = new MemoryAuditStore();
  } else if (auditStoreEnv === 'pg' || nodeEnv === 'production' || process.env.DATABASE_URL) {
    // 审计不跟随 DEMO_MODE 跳过 PG：审计是合规要求，不是演示数据
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- 延迟 require 避免 db/pool 启动期循环
    const mod = require('../../db/pool') as { getDb(): unknown };
    globalStore = new PgAuditStore(mod.getDb() as PgSql);
  } else {
    console.warn('[audit] using MemoryAuditStore — audit events will be LOST on restart (not for production)');
    globalStore = new MemoryAuditStore();
  }
  return globalStore;
}

/** BFF 启动时显式初始化并打印后端类型（避免懒加载导致运维看不到） */
export function initAuditStore(): AuditEventStore {
  const s = getAuditStore();
  console.log(`[audit] store=${s.kind}`);
  // 启动时让计数器在 /metrics 输出 0 值样本
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- 延迟 require 避免循环
    const mod = require('../observability/metrics') as { bffMetrics: { auditPersistFailed: { inc(labels?: unknown, v?: number): void } } };
    mod.bffMetrics.auditPersistFailed.inc({}, 0);
  } catch { /* ignore */ }
  return s;
}

export function __resetAuditStore(s: AuditEventStore | null = null): void {
  globalStore = s;
}
