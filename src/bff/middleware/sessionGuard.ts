/**
 * 健澜科技数智医院智能体 - 会话校验中间件（M7-F）
 *
 * attachUser 完成 JWT 验签后，本中间件按令牌 jti 校验服务端会话是否仍有效：
 *  - 会话已登出/被强制下线/已过期 → 视为未登录（后续 requireAuth 返回 401）；
 *  - 会话仍有效 → 放行。
 *
 * 性能：进程内缓存 jti 状态（短 TTL），吊销动作主动写入缓存，
 * 使单实例吊销即时生效，避免每请求都查库。
 *
 * 断库容错：缓存未命中且数据库不可用时放行（fail-open），
 * 由健康检查与各 handler 暴露真实错误，避免连带健康检查失效。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getActiveByJti } from '@/db/repositories/sessionRepo';

import type { Ctx } from '../types';

interface CacheEntry {
  active: boolean;
  expires: number;
}

const CACHE_TTL_MS = 30_000;
// 吊销结果缓存更久，确保断库/抖动期间仍能拦截
const REVOKED_TTL_MS = 5 * 60_000;

const cache = new Map<string, CacheEntry>();

/** 吊销后主动标记，使本实例立即拦截该令牌。 */
export function markSessionRevoked(jti: string): void {
  cache.set(jti, { active: false, expires: Date.now() + REVOKED_TTL_MS });
}

/** 清除 jti 缓存（会话创建/状态变化时使用）。 */
export function clearSessionCache(jti: string): void {
  cache.delete(jti);
}

async function isSessionActive(jti: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(jti);
  if (hit && hit.expires > now) return hit.active;

  try {
    const session = await getActiveByJti(jti);
    const active = session !== null;
    cache.set(jti, { active, expires: now + CACHE_TTL_MS });
    return active;
  } catch {
    // 数据库不可用：缓存未命中时放行，由健康检查/handler 暴露真实错误
    return true;
  }
}

/**
 * 校验当前请求令牌的会话状态；已失效则清空 ctx.user。
 * 无 jti 的令牌（演示令牌或 M7-F 前签发的旧令牌）不强制校验。
 *
 * v5.0试点扩展（M187登录根因）：演示模式（DEMO_MODE=1）下 registerSession 不落会话台账，
 * 但登录签发的 JWT 仍带 jti；若仍按 jti 查库一律查不到 → 误判会话失效而清空 c.user，
 * 导致登录后第一个鉴权请求（如 /dashboard/stats）即返回 401，前端 axios 拦截器随之
 * tokenStorage.clear() 并 navigate('/login')，表现为“登录成功却跳不进 dashboard、
 * localStorage 只剩 auth_session_v2 没有 auth_tokens”。演示模式无会话台账可校，直接放行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export async function enforceSession(c: Ctx): Promise<void> {
  // v5.0试点扩展（M187登录根因）：演示模式无会话台账，跳过 jti 查库，避免误杀合法 JWT
  const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
  if (isDemo) return;
  if (!c.user || !c.user.jti) return;
  const active = await isSessionActive(c.user.jti);
  if (!active) c.user = null;
}
