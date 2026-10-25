/**
 * 健澜科技数智医院智能体 - BFF 操作审计中间件
 *
 * 对所有状态变更请求（POST / PUT / DELETE）记录操作日志到 audit.operation_log：
 *   { userId, method, path, body(脱敏), timestamp }
 *
 * 设计要点：
 *  - 表不存在时自动 CREATE TABLE IF NOT EXISTS（幂等，启动后首次写自愈）；
 *  - 请求体经 maskBody 脱敏后再落库，避免 PII 明文入库；
 *  - 审计写库为 fire-and-forget：任何异常都不阻断主请求；
 *  - 演示模式（DEMO_MODE=1，无 DB）跳过落库仅限非生产环境；生产环境不得跳过。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../../db/pool.js';
import { isDemoModeEnabled, isProductionEnv } from '../config/runtimeEnv';
import type { Ctx } from '../types';
import { maskBody } from '../utils/mask.js';

/** 需要留痕的状态变更方法 */
const AUDITED_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

/** 建表语句（幂等） */
let _tableEnsured = false;

/**
 * 确保 audit.operation_log 表存在。
 * 进程内只执行一次；失败不抛错（下次写时再试）。
 *
 * @param db SQL 执行器（默认全局连接池）
 */
export async function ensureOperationLogTable(db: DbExecutor = getDb()): Promise<void> {
  if (_tableEnsured) return;
  await db`
    CREATE TABLE IF NOT EXISTS audit.operation_log (
      id          bigserial PRIMARY KEY,
      user_id     text,
      method      text NOT NULL,
      path        text NOT NULL,
      body        jsonb,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `;
  _tableEnsured = true;
}

/**
 * 记录一条操作审计日志。
 *
 * @param c 请求上下文（取 user、method、path、rawBody）
 * @param db SQL 执行器（默认全局连接池）
 */
export async function recordOperationLog(c: Ctx, db: DbExecutor = getDb()): Promise<void> {
  const method = c.req.method.toUpperCase();
  if (!AUDITED_METHODS.has(method)) return;

  // 解析并脱敏请求体（rawBody 为 BFF 预读的原始文本；解析失败记 null）
  let maskedBody: unknown = null;
  if (c.rawBody && c.rawBody.trim().length > 0) {
    try {
      maskedBody = maskBody(JSON.parse(c.rawBody) as unknown);
    } catch {
      maskedBody = null;
    }
  }

  await ensureOperationLogTable(db);
  // body 序列化为 JSON 文本参数化绑定（避免 postgres.json 严格泛型在边界的类型摩擦）
  const bodyJson = JSON.stringify(maskedBody);
  await db`
    INSERT INTO audit.operation_log (user_id, method, path, body)
    VALUES (${c.user?.id ?? null}, ${method}, ${c.req.url}, ${bodyJson}::jsonb)
  `;
}

/**
 * 审计中间件入口（fire-and-forget）。
 *
 * 在请求处理流程中调用，立即返回、不阻塞响应；审计写库失败仅打印告警，
 * 绝不影响主业务。
 *
 * @param c 请求上下文
 */
/**
 * 是否因演示模式跳过审计落库。
 * 演示模式跳过仅限非生产环境；生产环境即使误配 DEMO_MODE=1 也必须留痕。
 */
export function shouldSkipAuditForDemo(): boolean {
  return !isProductionEnv() && isDemoModeEnabled();
}

export function auditOperation(c: Ctx): void {
  if (shouldSkipAuditForDemo()) return;
  const method = c.req.method.toUpperCase();
  if (!AUDITED_METHODS.has(method)) return;
  recordOperationLog(c).catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.warn(`[audit] 操作日志写入失败（已忽略）: ${String(err)}`);
  });
}
