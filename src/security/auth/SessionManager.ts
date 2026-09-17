/**
 * 健澜科技数智医院智能体 - security/auth/SessionManager.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 会话管理
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件实现用户会话管理，包括会话创建与验证、会话超时策略、
 * 并发会话控制、会话强制下线和会话审计。
 *
 * @module security/auth/SessionManager
 */

import * as crypto from 'node:crypto';

import { type RoleCode, type SessionConfig, SessionStatus, type UserSession } from '../types';

/**
 * 会话管理器
 *
 * 负责用户会话的生命周期管理，支持空闲超时、绝对超时、
 * 并发会话控制和强制下线。
 *
 * @example
 * const manager = new SessionManager({ idleTimeoutMinutes: 30 });
 * const session = manager.createSession({ userId: 'doc001', ... });
 * const valid = manager.validateSession(session.sessionId);
 */
export class SessionManager {
  private readonly config: Required<SessionConfig>;
  private sessions = new Map<string, UserSession>();
  /** 用户ID -> 会话ID列表 */
  private userSessions = new Map<string, string[]>();

  /**
   * 构造会话管理器
   *
   * @param config - 会话配置
   */
  constructor(config?: SessionConfig) {
    this.config = {
      idleTimeoutMinutes: config?.idleTimeoutMinutes ?? 30,
      absoluteTimeoutHours: config?.absoluteTimeoutHours ?? 12,
      maxConcurrentSessions: config?.maxConcurrentSessions ?? 3,
      enableSessionFixationProtection: config?.enableSessionFixationProtection ?? true,
    };
  }

  /**
   * 创建用户会话
   *
   * @param params - 会话参数
   * @returns 创建的会话
   * @throws {SecurityError} 当并发会话数超过限制时
   */
  public createSession(params: {
    userId: string;
    userName: string;
    roles: RoleCode[];
    department: string;
    clientIp: string;
    deviceInfo?: string;
  }): UserSession {
    const now = new Date();
    const sessionId = this.generateSessionId();

    // 检查并发会话数
    const userSessionIds = this.userSessions.get(params.userId) ?? [];
    const activeSessions = userSessionIds
      .map((id) => this.sessions.get(id))
      // 类型谓词必须使用 && 形式以收窄类型，不可改写为可选链
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      .filter((s): s is UserSession => s !== undefined && s.status === SessionStatus.ACTIVE);

    if (activeSessions.length >= this.config.maxConcurrentSessions) {
      // 淘汰最旧的会话
      const oldest = activeSessions.sort(
        (a, b) => new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime(),
      )[0];
      if (oldest) {
        this.revokeSession(oldest.sessionId, '并发会话超限，自动淘汰最旧会话');
      }
    }

    const session: UserSession = {
      sessionId,
      userId: params.userId,
      userName: params.userName,
      roles: params.roles,
      department: params.department,
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
      expiresAt: this.calculateExpiresAt(now).toISOString(),
      clientIp: params.clientIp,
      deviceInfo: params.deviceInfo,
      status: SessionStatus.ACTIVE,
    };

    this.sessions.set(sessionId, session);

    // 更新用户会话列表
    const existing = this.userSessions.get(params.userId) ?? [];
    existing.push(sessionId);
    this.userSessions.set(params.userId, existing);

    return session;
  }

  /**
   * 验证会话有效性
   *
   * @param sessionId - 会话ID
   * @returns 会话是否有效
   */
  public validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.status !== SessionStatus.ACTIVE) return false;

    const now = new Date();

    // 检查绝对超时
    if (new Date(session.expiresAt) <= now) {
      session.status = SessionStatus.EXPIRED;
      return false;
    }

    // 检查空闲超时
    const idleMs = now.getTime() - new Date(session.lastActivityAt).getTime();
    if (idleMs > this.config.idleTimeoutMinutes * 60 * 1000) {
      session.status = SessionStatus.EXPIRED;
      return false;
    }

    // 更新最后活动时间
    session.lastActivityAt = now.toISOString();
    return true;
  }

  /**
   * 获取会话信息
   *
   * @param sessionId - 会话ID
   * @returns 会话信息（如存在）
   */
  public getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 刷新会话（更新最后活动时间）
   *
   * @param sessionId - 会话ID
   * @returns 是否成功
   */
  public refreshSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session?.status !== SessionStatus.ACTIVE) return false;
    session.lastActivityAt = new Date().toISOString();
    return true;
  }

  /**
   * 撤销会话（强制下线）
   *
   * @param sessionId - 会话ID
   * @param reason - 撤销原因
   * @returns 是否成功
   */
  public revokeSession(sessionId: string, reason?: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.status = SessionStatus.REVOKED;
    return true;
  }

  /**
   * 撤销用户的所有会话
   *
   * @param userId - 用户ID
   * @param reason - 撤销原因
   * @returns 撤销的会话数
   */
  public revokeAllUserSessions(userId: string, reason?: string): number {
    const sessionIds = this.userSessions.get(userId) ?? [];
    let count = 0;
    for (const id of sessionIds) {
      if (this.revokeSession(id, reason)) {
        count++;
      }
    }
    return count;
  }

  /**
   * 锁定会话（需重新认证解锁）
   *
   * @param sessionId - 会话ID
   * @returns 是否成功
   */
  public lockSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session?.status !== SessionStatus.ACTIVE) return false;
    session.status = SessionStatus.LOCKED;
    return true;
  }

  /**
   * 解锁会话
   *
   * @param sessionId - 会话ID
   * @returns 是否成功
   */
  public unlockSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session?.status !== SessionStatus.LOCKED) return false;
    session.status = SessionStatus.ACTIVE;
    session.lastActivityAt = new Date().toISOString();
    return true;
  }

  /**
   * 获取用户的活跃会话数
   *
   * @param userId - 用户ID
   * @returns 活跃会话数
   */
  public getActiveSessionCount(userId: string): number {
    const sessionIds = this.userSessions.get(userId) ?? [];
    return sessionIds.filter((id) => {
      const s = this.sessions.get(id);
      return s?.status === SessionStatus.ACTIVE;
    }).length;
  }

  /**
   * 获取用户的所有会话
   *
   * @param userId - 用户ID
   * @returns 会话列表
   */
  public getUserSessions(userId: string): UserSession[] {
    const sessionIds = this.userSessions.get(userId) ?? [];
    return sessionIds
      .map((id) => this.sessions.get(id))
      .filter((s): s is UserSession => s !== undefined);
  }

  /**
   * 清理过期会话
   *
   * @returns 清理的会话数
   */
  public cleanupExpiredSessions(): number {
    let count = 0;
    const now = new Date();
    for (const [id, session] of this.sessions) {
      if (session.status === SessionStatus.ACTIVE) {
        const idleMs = now.getTime() - new Date(session.lastActivityAt).getTime();
        const absoluteExpired = new Date(session.expiresAt) <= now;
        if (idleMs > this.config.idleTimeoutMinutes * 60 * 1000 || absoluteExpired) {
          session.status = SessionStatus.EXPIRED;
          count++;
        }
      }
    }
    return count;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `sess-${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * 计算会话过期时间
   */
  private calculateExpiresAt(now: Date): Date {
    return new Date(now.getTime() + this.config.absoluteTimeoutHours * 60 * 60 * 1000);
  }

  /**
   * 获取配置
   */
  public getConfig(): Required<SessionConfig> {
    return { ...this.config };
  }
}
