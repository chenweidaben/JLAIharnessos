/**
 * 健澜科技数智医院智能体 - 统一幂等键 Repository
 * clinical.idempotency_keys 表读写（M7-A）。
 *
 *  - beginProcessing：尝试为「用户 + 幂等键」落 processing 占位；
 *      首次成功返回 { outcome:'started' }，唯一约束冲突时回查已有记录，
 *      由调用方据其状态决定重放（completed）还是冲突（processing）。
 *  - completeProcessing：请求处理成功后写回响应状态与响应体。
 *  - discardProcessing：handler 抛错时删除占位，使客户端可用同一键安全重试。
 *
 * 幂等键按用户隔离；请求方法/路径/请求体指纹由调用方计算并传入。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export type IdempotencyStatus = 'processing' | 'completed';

export interface IdempotencyRecord {
  id: string;
  idempotencyKey: string;
  userId: string;
  method: string;
  requestPath: string;
  requestHash: string;
  status: IdempotencyStatus;
  responseStatus: number | null;
  responseBody: unknown;
  createdAt: string;
  completedAt: string | null;
}

export type BeginResult =
  | { outcome: 'started' }
  | { outcome: 'exists'; record: IdempotencyRecord };

function mapRow(row: Record<string, unknown>): IdempotencyRecord {
  return {
    id: String(row.id),
    idempotencyKey: String(row.idempotency_key),
    userId: String(row.user_id),
    method: String(row.method),
    requestPath: String(row.request_path),
    requestHash: String(row.request_hash),
    status: row.status as IdempotencyStatus,
    responseStatus: row.response_status != null ? Number(row.response_status) : null,
    responseBody: row.response_body ?? null,
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

const SELECT_COLS = `id, idempotency_key, user_id, method, request_path, request_hash,
  status, response_status, response_body, created_at, completed_at`;

/**
 * 尝试落 processing 占位。
 * @returns started 表示获得首次处理权；exists 表示已有记录（完成则重放、处理中则 409）。
 */
export async function beginProcessing(
  input: {
    idempotencyKey: string;
    userId: string;
    method: string;
    requestPath: string;
    requestHash: string;
  },
  sql?: DbExecutor,
): Promise<BeginResult> {
  const db = sql ?? getDb();
  try {
    await db`
      INSERT INTO clinical.idempotency_keys
        (idempotency_key, user_id, method, request_path, request_hash, status)
      VALUES
        (${input.idempotencyKey}, ${input.userId}, ${input.method},
         ${input.requestPath}, ${input.requestHash}, 'processing')`;
    return { outcome: 'started' };
  } catch (err) {
    // 23505 = unique_violation（(idempotency_key, user_id) 唯一约束）
    if ((err as { code?: string }).code === '23505') {
      const rows = await db`SELECT ${db.unsafe(SELECT_COLS)}
        FROM clinical.idempotency_keys
        WHERE idempotency_key = ${input.idempotencyKey} AND user_id = ${input.userId}`;
      if (rows.length === 0) throw err;
      return { outcome: 'exists', record: mapRow(rows[0] as Record<string, unknown>) };
    }
    throw err;
  }
}

/** 请求处理成功：写回响应状态与响应体，置为 completed。 */
export async function completeProcessing(
  input: {
    idempotencyKey: string;
    userId: string;
    responseStatus: number;
    responseBody: unknown;
  },
  sql?: DbExecutor,
): Promise<void> {
  const db = sql ?? getDb();
  await db`
    UPDATE clinical.idempotency_keys
      SET status = 'completed',
          response_status = ${input.responseStatus},
          response_body = ${db.json(toJson(input.responseBody))},
          completed_at = now()
    WHERE idempotency_key = ${input.idempotencyKey}
      AND user_id = ${input.userId}
      AND status = 'processing'`;
}

/** handler 抛错：删除 processing 占位，使同一键可安全重试。 */
export async function discardProcessing(
  input: { idempotencyKey: string; userId: string },
  sql?: DbExecutor,
): Promise<void> {
  const db = sql ?? getDb();
  await db`
    DELETE FROM clinical.idempotency_keys
    WHERE idempotency_key = ${input.idempotencyKey}
      AND user_id = ${input.userId}
      AND status = 'processing'`;
}

/** 按用户查询单条幂等记录（用于核对/巡检）。 */
export async function getRecord(
  idempotencyKey: string,
  userId: string,
  sql?: DbExecutor,
): Promise<IdempotencyRecord | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SELECT_COLS)}
    FROM clinical.idempotency_keys
    WHERE idempotency_key = ${idempotencyKey} AND user_id = ${userId}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}
