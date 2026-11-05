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
 * postgres.js ISql 形态：可作为模板标签调用 sql`...`，
 * 也有 sql.begin(tx => ...) 事务、sql.cursor(batch)`...` 流式。
 * 用宽松 any 类型避免与 postgres.js 严格泛型耦合。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SqlExecutor = any;

export interface AppendResult {
  ok: boolean;
  persisted: boolean;
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
}

// ---- 计数器（运行态 /metrics 暴露） ----
let persistFailedTotal = 0;
export function auditPersistFailedTotal(): number { return persistFailedTotal; }
export function __resetAuditMetrics(): void { persistFailedTotal = 0; }

function fallbackFile(): string {
  const dir = process.env.AUDIT_FALLBACK_DIR || join(process.cwd(), 'logs');
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
    // 延迟 import 避免循环依赖
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { bffMetrics } = require('../observability/metrics') as typeof import('../observability/metrics');
    bffMetrics.auditPersistFailed.inc();
  } catch { /* metrics 未就绪不阻塞 */ }
}

// ---- Memory ----
export class MemoryAuditStore implements AuditEventStore {
  readonly kind = 'memory' as const;
  private rows: AuditEvent[] = [];

  async append(evt: AuditEvent): Promise<AppendResult> {
    this.rows.push(evt);
    return { ok: true, persisted: true };
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
  async backfill(): Promise<AuditEvent[]> { return []; }
  all(): AuditEvent[] { return this.rows; }
  reset(): void { this.rows = []; }
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
  constructor(private readonly sql: SqlExecutor) {}

  async append(evt: AuditEvent): Promise<AppendResult> {
    try {
      // 事务内拿 advisory lock，锁在 COMMIT 时自动释放。
      // 锁内只做：取 MAX(seq)+1 + INSERT，不做 SM3、不写文件、不查别的表。
      await this.sql.begin(async (tx: SqlExecutor) => {
        await tx`
          WITH lock AS (SELECT pg_advisory_xact_lock(hashtext('audit_events_seq'))),
               nxt AS (SELECT COALESCE(MAX(seq),0)+1 AS seq FROM audit.events, lock)
          INSERT INTO audit.events
            (seq, event_id, occurred_at, actor_id, actor_role, action, module,
             resource_type, resource_id, patient_id, result, error_code, ip, user_agent,
             prev_hash, hash)
          SELECT nxt.seq, ${evt.eventId}, ${evt.occurredAt}, ${evt.actorId}, ${evt.actorRole},
                 ${evt.action}, ${evt.module}, ${evt.resourceType}, ${evt.resourceId},
                 ${evt.patientId ?? null}, ${evt.result}, ${evt.errorCode ?? null},
                 ${evt.ip}, ${evt.userAgent}, ${evt.prevHash}, ${evt.hash}
          FROM nxt
        `;
      });
      return { ok: true, persisted: true };
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
    const rows = await this.sql`SELECT COALESCE(MAX(seq),0)::bigint AS max FROM audit.events`;
    return Number(rows[0]?.max ?? 0);
  }

  async query(opts: {
    limit: number; offset: number;
    actorId?: string; module?: string; action?: string; result?: string; patientId?: string;
    from?: string; to?: string;
  }): Promise<{ rows: AuditEvent[]; total: number }> {
    // 所有过滤进 WHERE；total 用单独 count(*) 走同一 WHERE
    // postgres.js 模板标签自动参数化，用 WHERE AND ${cond} 片段
    const conds: any[] = [this.sql``]; // 占位，后续 AND
    const and = (frag: any) => conds.push(this.sql`AND ${frag}`);
    if (opts.actorId) and(this.sql`actor_id = ${opts.actorId}`);
    if (opts.module) and(this.sql`module = ${opts.module}`);
    if (opts.action) and(this.sql`action = ${opts.action}`);
    if (opts.result) and(this.sql`result = ${opts.result}`);
    if (opts.patientId) and(this.sql`patient_id = ${opts.patientId}`);
    if (opts.from) and(this.sql`occurred_at >= ${opts.from}`);
    if (opts.to) and(this.sql`occurred_at <= ${opts.to}`);
    // 第一片是占位空，去掉
    const where = conds.slice(1);
    const whereSql = where.length
      ? this.sql`WHERE ${this.sql.join(where, ' ')}`
      : this.sql``;

    const totalRows = await this.sql`SELECT COUNT(*)::bigint AS count FROM audit.events ${whereSql}`;
    const total = Number(totalRows[0]?.count ?? 0);

    const rows = await this.sql`
      SELECT * FROM audit.events ${whereSql}
      ORDER BY seq DESC
      LIMIT ${opts.limit} OFFSET ${opts.offset}
    `;
    return { rows: (rows as unknown as EventsRow[]).map(rowFromDb), total };
  }

  async *streamAll(): AsyncIterable<AuditEvent[]> {
    // postgres.js cursor：每 500 条一批
    const cursor = this.sql.cursor(500)`SELECT * FROM audit.events ORDER BY seq ASC`;
    // eslint-disable-next-line no-unreachable-loop
    for await (const batch of cursor) {
      yield (batch as unknown as EventsRow[]).map(rowFromDb);
    }
  }

  async backfill(fromSeq: number, limit = 1000): Promise<AuditEvent[]> {
    const rows = await this.sql`
      SELECT * FROM audit.events WHERE seq > ${fromSeq} ORDER BY seq ASC LIMIT ${limit}
    `;
    return (rows as unknown as EventsRow[]).map(rowFromDb);
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getDb } = require('../../db/pool') as typeof import('../../db/pool');
    globalStore = new PgAuditStore(getDb());
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { bffMetrics } = require('../observability/metrics') as typeof import('../observability/metrics');
    bffMetrics.auditPersistFailed.inc({}, 0);
  } catch { /* ignore */ }
  return s;
}

export function __resetAuditStore(s: AuditEventStore | null = null): void {
  globalStore = s;
}
