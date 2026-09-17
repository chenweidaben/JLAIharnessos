/**
 * 健澜科技杠OS - 会话存储（缓存侧）
 *
 * 刷新令牌会话高频校验走 Redis/内存缓存，PG iam.sessions 做持久审计。
 * 存储的是刷新令牌的哈希（绝不存明文令牌）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import type { ICache } from './types.js';
import { cacheKey } from './types.js';

export interface SessionPayload {
  userId: string;
  username: string;
  roles: string[];
  device?: string;
  ip?: string;
  /** 签发时间 */
  issuedAt: number;
}

export class SessionStore {
  constructor(private readonly cache: ICache) {}

  private key(refreshTokenHash: string): string {
    return cacheKey('session', refreshTokenHash);
  }

  async create(refreshTokenHash: string, payload: SessionPayload, ttlMs: number): Promise<void> {
    await this.cache.set(this.key(refreshTokenHash), payload as unknown as Record<string, unknown>, ttlMs);
  }

  async get(refreshTokenHash: string): Promise<SessionPayload | null> {
    return this.cache.get<SessionPayload>(this.key(refreshTokenHash));
  }

  /** 轮换刷新令牌：旧令牌失效（可保留短暂时限做宽限），签发新令牌 */
  async rotate(
    oldHash: string,
    newHash: string,
    ttlMs: number,
    graceMs = 0,
  ): Promise<SessionPayload | null> {
    const payload = await this.get(oldHash);
    if (!payload) return null;
    await this.revoke(oldHash);
    if (graceMs > 0) {
      // 宽限窗口内旧令牌标记为"已轮换"，防止并发刷新竞态
      await this.cache.set(this.key('rotated:' + oldHash), { newHash }, graceMs);
    }
    await this.create(newHash, { ...payload, issuedAt: Date.now() }, ttlMs);
    return payload;
  }

  async revoke(refreshTokenHash: string): Promise<void> {
    await this.cache.del(this.key(refreshTokenHash));
  }

  /** 按用户踢出全部会话（需要维护用户→令牌集合时使用；此处按传入哈希批量吊销） */
  async revokeAll(hashes: string[]): Promise<void> {
    await Promise.all(hashes.map((h) => this.revoke(h)));
  }
}
