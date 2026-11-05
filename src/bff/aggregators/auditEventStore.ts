/**
 * 健澜AI原生医院操作系统OS - 审计事件存储端口（P5-13）
 *
 * 存储可插拔：
 *  - MemoryAuditStore：单测/显式 AUDIT_STORE=memory，进程内存
 *  - PgAuditStore：生产，走 src/db/pool.ts，advisory lock 保证 seq 严格连续
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

/** 最小 SQL 执行器（postgres.js ISql 结构化兼容，便于测试注入 fake） */
export interface SqlExecutor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query<T extends Record<string, unknown>>(
    texts: TemplateStringsArray | string,
    ...params: unknown[]
  ): Promise<{ rows: T[] }>;
}

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

export class PgAuditStore implements AuditEventStore {
  readonly kind = 'pg' as const;
  constructor(private readonly sql: SqlExecutor) {}

  async append(evt: AuditEvent): Promise<AppendResult> {
    try {
      // 单语句隐式事务：advisory lock → MAX(seq)+1 → INSERT。锁随语句 COMMIT 释放。
      // 锁内只做这三步，不做 SM3、不写文件、不查别的表。
      await this.sql.query(
        `WITH lock AS (SELECT pg_advisory_xact_lock(hashtext('audit_events_seq'))),
             nxt AS (SELECT COALESCE(MAX(seq),0)+1 AS seq FROM audit.events, lock)
         INSERT INTO audit.events
           (seq, event_id, occurred_at, actor_id, actor_role, action, module,
            resource_type, resource_id, patient_id, result, error_code, ip, user_agent,
            prev_hash, hash)
         SELECT nxt.seq, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
         FROM nxt`,
        evt.seq,
        evt.eventId, evt.occurredAt, evt.actorId, evt.actorRole, evt.action, evt.module,
        evt.resourceType, evt.resourceId, evt.patientId ?? null, evt.result, evt.errorCode ?? null,
        evt.ip, evt.userAgent, evt.prevHash, evt.hash,
      );
      return { ok: true, persisted: true };
    } catch (err) {
      persistFailedTotal += 1;
      try {
        // 延迟 import 避免循环依赖
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { bffMetrics } = require('../observability/metrics') as typeof import('../observability/metrics');
        bffMetrics.auditPersistFailed.inc();
      } catch { /* metrics 未就绪不阻塞 */ }
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
    const r = await this.sql.query<{ max: string | number | null }>(
      'SELECT COALESCE(MAX(seq),0) AS max FROM audit.events',
    );
    return Number(r.rows[0]?.max ?? 0);
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
    globalStore = new PgAuditStore(getDb() as unknown as SqlExecutor);
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
  return s;
}

export function __resetAuditStore(s: AuditEventStore | null = null): void {
  globalStore = s;
}
