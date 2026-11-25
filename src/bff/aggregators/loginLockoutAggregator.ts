/**
 * 健澜AI原生医院操作系统OS - P4-3 登录防爆破 + 速率限制（等保三级硬要求）
 *
 * - 账号锁定：同一 username 连续失败 5 次 → lockedUntil = now + 15min
 * - IP 登录限流：同一 IP 1 分钟 >20 次 → 429 并临时封禁 5min
 * - 通用 read/write 限流：每 IP 100/min（读）、30/min（写）
 * - admin 可查/解锁
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export const ACCOUNT_FAIL_THRESHOLD = 5;
export const ACCOUNT_LOCK_MS = 15 * 60 * 1000; // 15min
export const IP_LOGIN_THRESHOLD = 20;
export const IP_LOGIN_WINDOW_MS = 60_000; // 1min
export const IP_LOGIN_BAN_MS = 5 * 60 * 1000; // 5min
export const READ_LIMIT = 100;
export const WRITE_LIMIT = 30;
export const GEN_WINDOW_MS = 60_000;

export interface AccountState {
  key: string;
  fails: number;
  firstFailAt: string;
  lockedUntil?: string;
}

export interface IpLoginState {
  key: string;
  hits: number[];
  bannedUntil?: string;
}

interface Bucket { count: number; windowStart: number; }

const accounts = new Map<string, AccountState>();
const ipLogin = new Map<string, IpLoginState>();
const readBuckets = new Map<string, Bucket>();
const writeBuckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  constructor(public status: number, public code: number, message: string, public retryAfterSec: number) {
    super(message);
  }
}

// ---------- Account lockout ----------
export function checkAccountLockout(username: string): AccountState | null {
  const s = accounts.get(username);
  if (!s?.lockedUntil) return null;
  if (new Date(s.lockedUntil).getTime() < Date.now()) {
    // 锁已过期，自动解锁
    accounts.delete(username);
    return null;
  }
  return s;
}

export function recordAccountFailure(username: string): AccountState {
  const now = new Date().toISOString();
  let s = accounts.get(username);
  if (!s) {
    s = { key: username, fails: 0, firstFailAt: now };
    accounts.set(username, s);
  }
  s.fails += 1;
  if (s.fails >= ACCOUNT_FAIL_THRESHOLD) {
    s.lockedUntil = new Date(Date.now() + ACCOUNT_LOCK_MS).toISOString();
  }
  return s;
}

export function resetAccountFailures(username: string): void {
  accounts.delete(username);
}

export function adminUnlockAccount(username: string): boolean {
  return accounts.delete(username);
}

// ---------- IP login throttle ----------
export function checkIpLogin(ip: string): IpLoginState | null {
  const s = ipLogin.get(ip);
  if (!s) return null;
  if (s.bannedUntil && new Date(s.bannedUntil).getTime() < Date.now()) {
    ipLogin.delete(ip);
    return null;
  }
  if (s.bannedUntil) return s;
  // 清理窗口外 hits
  const now = Date.now();
  s.hits = s.hits.filter((t) => now - t < IP_LOGIN_WINDOW_MS);
  if (s.hits.length <= IP_LOGIN_THRESHOLD) return null;
  // 超限：封禁 5min
  s.bannedUntil = new Date(now + IP_LOGIN_BAN_MS).toISOString();
  return s;
}

export function recordIpLoginHit(ip: string): IpLoginState {
  const now = Date.now();
  let s = ipLogin.get(ip);
  if (!s) {
    s = { key: ip, hits: [] };
    ipLogin.set(ip, s);
  }
  s.hits.push(now);
  if (s.hits.length > IP_LOGIN_THRESHOLD && !s.bannedUntil) {
    s.bannedUntil = new Date(now + IP_LOGIN_BAN_MS).toISOString();
  }
  return s;
}

export function adminUnlockIp(ip: string): boolean {
  return ipLogin.delete(ip);
}

// ---------- General read/write buckets ----------
function takeBucket(map: Map<string, Bucket>, key: string, limit: number, windowMs: number): number | null {
  const now = Date.now();
  let b = map.get(key);
  if (!b || now - b.windowStart > windowMs) {
    b = { count: 0, windowStart: now };
    map.set(key, b);
  }
  b.count += 1;
  if (b.count > limit) {
    const retryMs = windowMs - (now - b.windowStart);
    return Math.ceil(retryMs / 1000);
  }
  return null;
}

/* ---------- 周期清扫（防内存无界增长） ----------
 * readBuckets/writeBuckets/ipLogin/accounts 均为模块级常驻 Map：
 * 每个唯一 key（IP / 用户名）都会留下条目，长跑或遭遇 XFF/随机用户名探测时
 * 会无限增长。这里每 5 分钟清扫一次过期条目：
 *  - 限流桶：windowStart 超过 2 个窗口未活动即删除；
 *  - ipLogin：hits 全部滑出窗口且未在封禁期即删除；
 *  - accounts：未锁定即删除（锁定中的保留到自然过期解锁）。
 */
const SWEEP_INTERVAL_MS = 5 * 60_000;

function sweepMaps(): void {
  const now = Date.now();
  for (const [k, b] of readBuckets) {
    if (now - b.windowStart > 2 * GEN_WINDOW_MS) readBuckets.delete(k);
  }
  for (const [k, b] of writeBuckets) {
    if (now - b.windowStart > 2 * GEN_WINDOW_MS) writeBuckets.delete(k);
  }
  for (const [k, s] of ipLogin) {
    const banned = s.bannedUntil && new Date(s.bannedUntil).getTime() > now;
    const active = s.hits.some((t) => now - t < IP_LOGIN_WINDOW_MS);
    if (!banned && !active) ipLogin.delete(k);
  }
  for (const [k, s] of accounts) {
    const locked = s.lockedUntil && new Date(s.lockedUntil).getTime() > now;
    if (!locked) accounts.delete(k);
  }
}

// 模块级定时器；unref 避免阻止进程退出（Bun/Node 均支持）
const sweepTimer = setInterval(sweepMaps, SWEEP_INTERVAL_MS);
if (typeof sweepTimer === 'object' && sweepTimer && 'unref' in sweepTimer) {
  (sweepTimer as { unref: () => void }).unref();
}

/** 测试钩子：停止清扫定时器（集成测试进程退出用） */
export function _stopRateLimitSweeper(): void {
  clearInterval(sweepTimer);
}

export function takeReadToken(ip: string): number | null {
  return takeBucket(readBuckets, ip, READ_LIMIT, GEN_WINDOW_MS);
}
export function takeWriteToken(ip: string): number | null {
  return takeBucket(writeBuckets, ip, WRITE_LIMIT, GEN_WINDOW_MS);
}

// ---------- Admin status ----------
export interface StatusItem {
  type: 'account' | 'ip-login';
  key: string;
  fails?: number;
  lockedUntil?: string;
  bannedUntil?: string;
  hits?: number;
}
export function listStatus(): StatusItem[] {
  const now = Date.now();
  const out: StatusItem[] = [];
  for (const s of accounts.values()) {
    if (s.lockedUntil && new Date(s.lockedUntil).getTime() >= now) {
      out.push({ type: 'account', key: s.key, fails: s.fails, lockedUntil: s.lockedUntil });
    }
  }
  for (const s of ipLogin.values()) {
    if (s.bannedUntil && new Date(s.bannedUntil).getTime() >= now) {
      out.push({ type: 'ip-login', key: s.key, hits: s.hits.length, bannedUntil: s.bannedUntil });
    }
  }
  return out;
}

export function __resetStore(): void {
  accounts.clear(); ipLogin.clear(); readBuckets.clear(); writeBuckets.clear();
}

/* ============================================================================
 * 分布式后端（Redis，多副本共享）
 *
 * 进程内 Map 版本在多实例部署时各副本独立计数，限流/锁定被横向打散失效。
 * server 启动时装配 createCacheServices() 并调用 initDistributedRateLimit()：
 *  - REDIS_URL 可用 → 走 Redis 固定窗口（incrAndExpire 原子），跨副本一致；
 *  - 未配置/连接失败/运行时故障 → 自动回落进程内实现（限流不中断，降级为单机语义）。
 * ==========================================================================*/

import type { RateLimiter } from '../../cache/RateLimiter.js';

let distributed: RateLimiter | null = null;

/** 装配分布式限流后端（服务启动时调用一次；传 null 显式回退内存模式） */
export function initDistributedRateLimit(limiter: RateLimiter | null): void {
  distributed = limiter;
}

/** 当前是否处于分布式（跨副本一致）模式 */
export function isDistributedRateLimit(): boolean {
  return distributed !== null;
}

export async function takeReadTokenAsync(ip: string): Promise<number | null> {
  if (!distributed) return takeReadToken(ip);
  try {
    const r = await distributed.consume('bff-read', ip, { limit: READ_LIMIT, windowMs: GEN_WINDOW_MS });
    return r.allowed ? null : Math.max(1, Math.ceil(r.resetMs / 1000));
  } catch {
    return takeReadToken(ip); // Redis 故障降级内存，限流不中断
  }
}

export async function takeWriteTokenAsync(ip: string): Promise<number | null> {
  if (!distributed) return takeWriteToken(ip);
  try {
    const r = await distributed.consume('bff-write', ip, { limit: WRITE_LIMIT, windowMs: GEN_WINDOW_MS });
    return r.allowed ? null : Math.max(1, Math.ceil(r.resetMs / 1000));
  } catch {
    return takeWriteToken(ip);
  }
}

/**
 * 通用分布式固定窗口取牌：超限返回重试秒数，放行返回 null。
 * 未装配分布式后端时返回 'no-distributed' 哨兵，由调用方回落进程内实现。
 */
export async function takeTokenAsync(
  scope: string,
  identity: string,
  limit: number,
  windowMs: number,
): Promise<number | null | 'no-distributed'> {
  if (!distributed) return 'no-distributed';
  try {
    const r = await distributed.consume(scope, identity, { limit, windowMs });
    return r.allowed ? null : Math.max(1, Math.ceil(r.resetMs / 1000));
  } catch {
    return 'no-distributed'; // Redis 故障：调用方回落进程内实现
  }
}

// ---------- Account lockout（分布式） ----------

export async function checkAccountLockoutAsync(username: string): Promise<AccountState | null> {
  if (!distributed) return checkAccountLockout(username);
  try {
    const fails = await distributed.peek('login-fail', username, ACCOUNT_LOCK_MS);
    if (fails < ACCOUNT_FAIL_THRESHOLD) return null;
    // lockedUntil 仅作展示估计，真实过期由 Redis 键 TTL 控制
    return {
      key: username,
      fails,
      firstFailAt: '',
      lockedUntil: new Date(Date.now() + ACCOUNT_LOCK_MS).toISOString(),
    };
  } catch {
    return checkAccountLockout(username);
  }
}

export async function recordAccountFailureAsync(username: string): Promise<AccountState> {
  if (!distributed) return recordAccountFailure(username);
  try {
    const r = await distributed.consume('login-fail', username, {
      limit: Number.MAX_SAFE_INTEGER, // 计数不拦截，仅观察阈值
      windowMs: ACCOUNT_LOCK_MS,
    });
    const locked = r.count >= ACCOUNT_FAIL_THRESHOLD;
    return {
      key: username,
      fails: r.count,
      firstFailAt: new Date().toISOString(),
      lockedUntil: locked ? new Date(Date.now() + r.resetMs).toISOString() : undefined,
    };
  } catch {
    return recordAccountFailure(username);
  }
}

export async function resetAccountFailuresAsync(username: string): Promise<void> {
  if (!distributed) return resetAccountFailures(username);
  try {
    await distributed.reset('login-fail', username);
  } catch {
    resetAccountFailures(username);
  }
}

export async function adminUnlockAccountAsync(username: string): Promise<boolean> {
  if (!distributed) return adminUnlockAccount(username);
  try {
    const fails = await distributed.peek('login-fail', username, ACCOUNT_LOCK_MS);
    await distributed.reset('login-fail', username);
    return fails > 0;
  } catch {
    return adminUnlockAccount(username);
  }
}

// ---------- IP login throttle（分布式） ----------

export async function checkIpLoginAsync(ip: string): Promise<IpLoginState | null> {
  if (!distributed) return checkIpLogin(ip);
  try {
    const ms = await distributed.bannedMs('login-ip', ip);
    if (ms === null) return null;
    return { key: ip, hits: [], bannedUntil: new Date(Date.now() + ms).toISOString() };
  } catch {
    return checkIpLogin(ip);
  }
}

export async function recordIpLoginHitAsync(ip: string): Promise<IpLoginState> {
  if (!distributed) return recordIpLoginHit(ip);
  try {
    const banned = await distributed.bannedMs('login-ip', ip);
    if (banned !== null) {
      return { key: ip, hits: [], bannedUntil: new Date(Date.now() + banned).toISOString() };
    }
    const r = await distributed.consume('login-ip', ip, {
      limit: IP_LOGIN_THRESHOLD,
      windowMs: IP_LOGIN_WINDOW_MS,
    });
    if (!r.allowed) {
      await distributed.ban('login-ip', ip, IP_LOGIN_BAN_MS);
      return { key: ip, hits: [], bannedUntil: new Date(Date.now() + IP_LOGIN_BAN_MS).toISOString() };
    }
    return { key: ip, hits: [] };
  } catch {
    return recordIpLoginHit(ip);
  }
}

export async function adminUnlockIpAsync(ip: string): Promise<boolean> {
  if (!distributed) return adminUnlockIp(ip);
  try {
    const banned = await distributed.bannedMs('login-ip', ip);
    await distributed.unban('login-ip', ip);
    await distributed.reset('login-ip', ip);
    return banned !== null;
  } catch {
    return adminUnlockIp(ip);
  }
}
