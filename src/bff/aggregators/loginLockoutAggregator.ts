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
  if (!s || !s.lockedUntil) return null;
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
