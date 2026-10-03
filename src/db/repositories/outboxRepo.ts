/**
 * 健澜科技数智医院智能体 - 事务性发件箱 Repository
 * clinical.event_outbox 表读写（M7-C）。
 *
 * 状态机 pending -> processing -> published（at-least-once）：
 *  - appendEvent：在业务事务内写入一条领域事件（与业务数据同事务、原子提交）；
 *  - claimBatch：Relay 认领一批 pending（FOR UPDATE SKIP LOCKED，标记 processing），
 *      支持多实例并发分摊、不重复锁定；
 *  - markPublished：发布成功后标记 published；
 *  - resetToPending：发布失败时回滚为 pending 并累加 attempts，下轮重试；
 *  - reclaimStale：认领后崩溃（processing 超时）的事件回收为 pending。
 *
 * 每条事件有稳定 event_id（uuid），消费端按其幂等（M7-B 前端已按 id 去重）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export type OutboxStatus = 'pending' | 'processing' | 'published';

export interface OutboxEvent {
  id: number;
  eventId: string;
  eventType: string;
  aggregateType: string | null;
  aggregateId: string | null;
  payload: unknown;
  status: OutboxStatus;
  attempts: number;
  createdAt: string;
  lockedAt: string | null;
  publishedAt: string | null;
}

export interface NewOutboxEvent {
  eventId: string;
  eventType: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  payload: unknown;
}

const SELECT_COLS = `id, event_id, event_type, aggregate_type, aggregate_id, payload,
  status, attempts, created_at, locked_at, published_at`;

function mapRow(row: Record<string, unknown>): OutboxEvent {
  return {
    id: Number(row.id),
    eventId: String(row.event_id),
    eventType: String(row.event_type),
    aggregateType: row.aggregate_type != null ? String(row.aggregate_type) : null,
    aggregateId: row.aggregate_id != null ? String(row.aggregate_id) : null,
    payload: row.payload ?? null,
    status: row.status as OutboxStatus,
    attempts: Number(row.attempts),
    createdAt: String(row.created_at),
    lockedAt: row.locked_at ? String(row.locked_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
  };
}

/**
 * 在业务事务内写入一条领域事件。
 * 必须随业务事务传入 sql（tx），保证事件与业务变更原子提交。
 */
export async function appendEvent(input: NewOutboxEvent, sql: DbExecutor): Promise<void> {
  await sql`
    INSERT INTO clinical.event_outbox
      (event_id, event_type, aggregate_type, aggregate_id, payload, status)
    VALUES
      (${input.eventId}, ${input.eventType}, ${input.aggregateType ?? null},
       ${input.aggregateId ?? null}, ${sql.json(toJson(input.payload))}, 'pending')`;
}

/**
 * Relay 认领一批 pending 事件：加行锁并标记 processing（返回认领的事件）。
 * FOR UPDATE SKIP LOCKED：多个 Relay 实例并发时跳过被锁定的行，实现负载分摊。
 */
export async function claimBatch(
  batchSize: number,
  tx: DbExecutor,
): Promise<OutboxEvent[]> {
  const rows = await tx`
    WITH picked AS (
      SELECT id AS picked_id
      FROM clinical.event_outbox
      WHERE status = 'pending'
      ORDER BY id
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE clinical.event_outbox e
      SET status = 'processing', locked_at = now()
    FROM picked
    WHERE e.id = picked.picked_id
    RETURNING ${tx.unsafe(SELECT_COLS)}`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/** 发布成功：processing -> published。 */
export async function markPublished(ids: number[], sql?: DbExecutor): Promise<void> {
  if (ids.length === 0) return;
  const db = sql ?? getDb();
  await db`
    UPDATE clinical.event_outbox
      SET status = 'published', published_at = now()
    WHERE id IN ${db(ids)} AND status = 'processing'`;
}

/** 发布失败：processing -> pending，attempts+1，下轮重试。 */
export async function resetToPending(ids: number[], sql?: DbExecutor): Promise<void> {
  if (ids.length === 0) return;
  const db = sql ?? getDb();
  await db`
    UPDATE clinical.event_outbox
      SET status = 'pending', attempts = attempts + 1, locked_at = NULL
    WHERE id IN ${db(ids)} AND status = 'processing'`;
}

/**
 * 回收认领后崩溃的事件：processing 且 locked_at 超过 staleMs，重置为 pending。
 * 应周期性调用（Relay 每轮或定时）。
 */
export async function reclaimStale(staleMs: number, sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.event_outbox
      SET status = 'pending', locked_at = NULL
    WHERE status = 'processing'
      AND locked_at < now() - make_interval(secs => ${Math.floor(staleMs / 1000)})
    RETURNING id`;
  return (rows as unknown[]).length;
}

/** 按聚合查询其事件历史（排障/审计）。 */
export async function listByAggregate(
  aggregateType: string,
  aggregateId: string,
  sql?: DbExecutor,
): Promise<OutboxEvent[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)}
    FROM clinical.event_outbox
    WHERE aggregate_type = ${aggregateType} AND aggregate_id = ${aggregateId}
    ORDER BY id`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/** 统计各状态事件数（巡检/取证）。 */
export async function countByStatus(
  sql?: DbExecutor,
): Promise<Record<OutboxStatus, number>> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT status, count(*)::int AS n
    FROM clinical.event_outbox GROUP BY status`;
  const result: Record<OutboxStatus, number> = { pending: 0, processing: 0, published: 0 };
  for (const r of rows as Record<string, unknown>[]) {
    result[r.status as OutboxStatus] = Number(r.n);
  }
  return result;
}
