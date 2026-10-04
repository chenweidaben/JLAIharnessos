/* ============================================================================
 * 健澜科技杠OS - 会话管理 API 服务（M7-F）
 *
 * 真实 BFF（src/bff/routes/sessions.ts），读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { get, post } from '../request';
import type { ActiveSession, RevokeResult } from '@/types/session';

/** 列出活跃会话（可按用户 ID 过滤）。 */
export function fetchActiveSessions(userId?: string): Promise<ActiveSession[]> {
  const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return get<ActiveSession[]>(`/admin/sessions${qs}`);
}

/** 按会话 jti 强制下线（吊销单个会话）。 */
export function revokeSessionByJti(jti: string): Promise<RevokeResult> {
  return post<RevokeResult>('/admin/sessions/revoke', { jti });
}

/** 按用户 ID 强制下线（吊销该用户全部会话，管理员当前会话除外）。 */
export function forceUserOffline(userId: string): Promise<RevokeResult> {
  return post<RevokeResult>('/admin/sessions/revoke', { userId });
}
