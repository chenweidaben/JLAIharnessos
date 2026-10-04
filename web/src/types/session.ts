/* ============================================================================
 * 健澜科技杠OS - 会话管理类型（M7-F）
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

/** 活跃会话（对应 clinical.user_sessions 中未吊销、未过期的记录）。 */
export interface ActiveSession {
  /** 访问令牌唯一标识（JWT ID） */
  jti: string;
  /** 登录用户 ID（iam.users.id） */
  userId: string;
  /** 会话签发时间（ISO 8601） */
  issuedAt: string;
  /** 访问令牌过期时间（ISO 8601） */
  accessExpiresAt: string;
  /** 登录终端 IP（经代理转发头） */
  ip: string | null;
  /** 登录终端 User-Agent */
  userAgent: string | null;
}

/** 强制下线结果。 */
export interface RevokeResult {
  /** 实际吊销的会话数量 */
  revoked: number;
}
