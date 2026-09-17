/**
 * 健澜科技杠OS - 缓存层测试
 *
 * 以内存缓存为底座，验证 TTL、SET-NX 互斥、原子自增、分布式锁（含看门狗）、
 * 限流、会话轮换、缓存旁路（防击穿/穿透/雪崩）。这些逻辑对 Redis 同样适用。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { describe, it, expect } from 'bun:test';
import {
  MemoryCache,
  DistributedLock,
  RateLimiter,
  SessionStore,
  CacheAside,
  cacheKey,
} from '@/cache/index.js';

const tick = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('MemoryCache 基础', () => {
  it('读写、删除、JSON 结构', async () => {
    const c = new MemoryCache();
    expect(await c.get('x')).toBeNull();
    await c.set('x', { a: 1, b: [2, 3] });
    expect(await c.get<{ a: number; b: number[] }>('x')).toEqual({ a: 1, b: [2, 3] });
    expect(await c.del('x')).toBe(true);
    expect(await c.get('x')).toBeNull();
  });

  it('TTL 过期', async () => {
    const c = new MemoryCache();
    await c.set('k', 'v', 40);
    expect(await c.ttl('k')).toBeGreaterThan(0);
    await tick(60);
    expect(await c.get('k')).toBeNull();
    expect(await c.ttl('k')).toBe(-2);
  });

  it('setNx 互斥：存在则失败', async () => {
    const c = new MemoryCache();
    expect(await c.setNx('lock', 't1', 1000)).toBe(true);
    expect(await c.setNx('lock', 't2', 1000)).toBe(false);
  });

  it('incrAndExpire 固定窗口自增且仅首次设过期', async () => {
    const c = new MemoryCache();
    expect(await c.incrAndExpire('w', 1000)).toBe(1);
    expect(await c.incrAndExpire('w', 1000)).toBe(2);
    expect(await c.incrAndExpire('w', 1000, 5)).toBe(7);
    expect(await c.ttl('w')).toBeGreaterThan(0);
  });

  it('releaseIfValue 仅持有者可释放', async () => {
    const c = new MemoryCache();
    await c.setNx('l', 'owner', 1000);
    expect(await c.releaseIfValue('l', 'other')).toBe(false);
    expect(await c.exists('l')).toBe(true);
    expect(await c.releaseIfValue('l', 'owner')).toBe(true);
    expect(await c.exists('l')).toBe(false);
  });

  it('模式删除', async () => {
    const c = new MemoryCache();
    await c.set(cacheKey('agent', 'a'), 1);
    await c.set(cacheKey('agent', 'b'), 2);
    await c.set(cacheKey('other', 'a'), 3);
    const n = await c.deletePattern('jianlan:agent:*');
    expect(n).toBe(2);
    expect(await c.exists(cacheKey('other', 'a'))).toBe(true);
  });
});

describe('分布式锁', () => {
  it('互斥：第二个持有者获取失败，释放后可再获取', async () => {
    const lock = new DistributedLock(new MemoryCache());
    const lease = await lock.acquire('patient:P1:record', { waitTimeoutMs: 0 });
    expect(lease).toBeTruthy();
    await expect(lock.acquire('patient:P1:record', { waitTimeoutMs: 30, retryIntervalMs: 10 })).rejects.toThrow();
    await lock.release(lease);
    const again = await lock.acquire('patient:P1:record', { waitTimeoutMs: 0 });
    expect(again).toBeTruthy();
  });

  it('withLock 异常时仍释放锁', async () => {
    const lock = new DistributedLock(new MemoryCache());
    await expect(
      lock.withLock('rx:1', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const lease = await lock.tryAcquire('rx:1');
    expect(lease).not.toBeNull();
  });

  it('看门狗在 TTL 到期前自动续期', async () => {
    const cache = new MemoryCache();
    const lock = new DistributedLock(cache);
    await lock.withLock(
      'long-task',
      async () => {
        await tick(160); // TTL=100，看门狗间隔 ~33，期间应多次续期
        expect(await cache.exists('jianlan:lock:long-task')).toBe(true);
      },
      { ttlMs: 100, waitTimeoutMs: 0 },
    );
    // 结束后已释放
    expect(await cache.exists('jianlan:lock:long-task')).toBe(false);
  });
});

describe('限流器', () => {
  it('超过窗口额度拒绝并给出剩余配额', async () => {
    const rl = new RateLimiter(new MemoryCache());
    const rule = { limit: 3, windowMs: 1000 };
    const r1 = await rl.consume('api', 'user-1', rule);
    const r2 = await rl.consume('api', 'user-1', rule);
    const r3 = await rl.consume('api', 'user-1', rule);
    const r4 = await rl.consume('api', 'user-1', rule);
    expect([r1.allowed, r2.allowed, r3.allowed]).toEqual([true, true, true]);
    expect(r3.remaining).toBe(0);
    expect(r4.allowed).toBe(false);
  });

  it('不同身份互不影响，reset 后恢复', async () => {
    const rl = new RateLimiter(new MemoryCache());
    const rule = { limit: 1, windowMs: 1000 };
    expect((await rl.consume('login', 'ip-a', rule)).allowed).toBe(true);
    expect((await rl.consume('login', 'ip-a', rule)).allowed).toBe(false);
    expect((await rl.consume('login', 'ip-b', rule)).allowed).toBe(true);
    await rl.reset('login', 'ip-a');
    expect((await rl.consume('login', 'ip-a', rule)).allowed).toBe(true);
  });
});

describe('会话存储', () => {
  it('创建、读取、吊销', async () => {
    const s = new SessionStore(new MemoryCache());
    await s.create('hash1', { userId: 'u1', username: '张医生', roles: ['doctor'], issuedAt: 1 }, 1000);
    expect((await s.get('hash1'))?.userId).toBe('u1');
    await s.revoke('hash1');
    expect(await s.get('hash1')).toBeNull();
  });

  it('轮换：旧令牌失效、新令牌生效', async () => {
    const s = new SessionStore(new MemoryCache());
    await s.create('old', { userId: 'u1', username: '张医生', roles: ['doctor'], issuedAt: 1 }, 1000);
    const payload = await s.rotate('old', 'new', 1000);
    expect(payload?.userId).toBe('u1');
    expect(await s.get('old')).toBeNull();
    expect((await s.get('new'))?.userId).toBe('u1');
  });
});

describe('缓存旁路', () => {
  it('命中缓存不回源', async () => {
    const aside = new CacheAside(new MemoryCache());
    let calls = 0;
    const loader = async () => (calls++, `data-${calls}`);
    const a = await aside.getOrFetch('patient', 'P1', loader, { ttlMs: 1000 });
    const b = await aside.getOrFetch('patient', 'P1', loader, { ttlMs: 1000 });
    expect(a).toBe('data-1');
    expect(b).toBe('data-1');
    expect(calls).toBe(1);
  });

  it('singleflight：并发同 key 只回源一次（防击穿）', async () => {
    const aside = new CacheAside(new MemoryCache());
    let calls = 0;
    const loader = async () => {
      calls++;
      await tick(30);
      return 'v';
    };
    const results = await Promise.all(
      Array.from({ length: 10 }, () => aside.getOrFetch('hot', 'k1', loader, { ttlMs: 1000 })),
    );
    expect(calls).toBe(1);
    expect(results.every((r) => r === 'v')).toBe(true);
  });

  it('空值短 TTL 缓存（防穿透）', async () => {
    const aside = new CacheAside(new MemoryCache());
    let calls = 0;
    const loader = async () => {
      calls++;
      return null;
    };
    await aside.getOrFetch('patient', 'missing', loader, { ttlMs: 1000 });
    await aside.getOrFetch('patient', 'missing', loader, { ttlMs: 1000 });
    expect(calls).toBe(1);
  });

  it('forceRefresh 强制回源', async () => {
    const aside = new CacheAside(new MemoryCache());
    let calls = 0;
    const loader = async () => (calls++, calls);
    await aside.getOrFetch('x', '1', loader, { ttlMs: 1000 });
    const fresh = await aside.getOrFetch('x', '1', loader, { ttlMs: 1000, forceRefresh: true });
    expect(fresh).toBe(2);
  });
});
