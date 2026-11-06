/**
 * 健澜AI原生医院操作系统OS - P5-16 WORM 存储装饰层：超时 + 并发上限 + put 超时补救
 *
 * 职责：
 * - 按方法分档超时（put 30s / get 5s / list 10s / countBySigner 5s / refresh 10s / newestSeq 5s）
 * - 全局 in-flight 信号量（默认 20），超出排队
 * - put 超时后调 inner.probe(segmentId) 探测对象是否已落盘，存在则视为成功，避免上层重试产生重复段
 *
 * 重要诚实声明：
 * - 当前 AsyncWormStore 接口不支持 AbortSignal。withTimeout 用 Promise.race 实现"停止等待"，
 *   底层网络请求会继续到自然结束。这不是真正的取消。未来接入真实 S3 client 时，
 *   应把 AbortSignal 透传到 put/get/list 的参数里，再在超时回调里 abort。
 * - 本层不修改 inner 语义；它只是加超时和并发闸门。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AsyncWormStore } from './wormStore.js';
import type { WormSegment } from './wormArchiveAggregator.js';

export interface ResilienceOptions {
  /** 每方法超时 ms，默认见 DEFAULT_TIMEOUTS */
  timeouts?: Partial<Record<'put' | 'get' | 'list' | 'countBySigner' | 'refresh' | 'newestSeq', number>>;
  /** in-flight 上限，默认 20 */
  maxInFlight?: number;
}

export interface ResilienceStats {
  /** 累计超时次数（按方法分桶） */
  timeoutsByMethod: Record<string, number>;
  /** put 超时但 probe 发现对象已存在的次数（视为成功，不抛错） */
  putTimeoutButExists: number;
  /** 当前排队等待信号量的数量 */
  queueDepth: number;
  /** 当前 in-flight 数 */
  inFlight: number;
}

/**
 * 可选的 S3 特有探测能力。本地 fs/内存 store 不需要实现；
 * 真实 S3 后端接入时由 S3WormStore 提供（对应 headObject）。
 */
export interface ProbeableStore {
  /** 判断 segmentId 对应的对象是否已存在（不返回内容，只元数据 HEAD） */
  probe(segmentId: string): Promise<boolean>;
}

export const DEFAULT_TIMEOUTS = {
  put: 30_000,
  get: 5_000,
  list: 10_000,
  countBySigner: 5_000,
  refresh: 10_000,
  newestSeq: 5_000,
} as const;

export const DEFAULT_MAX_IN_FLIGHT = 20;

/**
 * 跑一个 promise，最多等 ms；超时抛 Error('worm-store-timeout')，label 进 message。
 *
 * 注意：这不是真取消。底层 promise 会继续跑到底，结果被丢弃。
 */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const e = new Error(`worm-store-timeout: ${label} exceeded ${ms}ms`);
      e.name = 'WormStoreTimeout';
      (e as { code?: string }).code = 'worm-store-timeout';
      reject(e);
    }, ms);
    // 不 ref：让 timer 不阻止事件循环退出
    if (typeof timer === 'object' && timer && 'unref' in timer) {
      (timer as { unref: () => void }).unref();
    }
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** 简单 FIFO 信号量：acquire() 返回 release 函数。 */
export function createSemaphore(maxInFlight: number): {
  acquire(): Promise<() => void>;
  size(): number;
  inflight(): number;
} {
  let active = 0;
  const waiters: (() => void)[] = [];
  return {
    acquire() {
      return new Promise<() => void>((resolve) => {
        const tryAcquire = () => {
          if (active < maxInFlight) {
            active++;
            let released = false;
            resolve(() => {
              if (released) return;
              released = true;
              active--;
              const next = waiters.shift();
              if (next) next();
            });
          } else {
            waiters.push(tryAcquire);
          }
        };
        tryAcquire();
      });
    },
    size() { return maxInFlight; },
    inflight() { return active; },
  };
}

function isProbeable(s: unknown): s is ProbeableStore {
  return typeof s === 'object' && s !== null && typeof (s as ProbeableStore).probe === 'function';
}

export interface ResilientWormStore extends AsyncWormStore {
  stats(): ResilienceStats;
}

/**
 * 给 AsyncWormStore 套一层超时 + 并发上限 + put 超时补救。
 *
 * put 超时补救逻辑：
 * - 超时后如果 inner 实现了 ProbeableStore（probe），调 probe(segmentId)。
 *   存在 → 视为 put 成功（对象其实已经落盘，只是响应没回来），记 putTimeoutButExists，不抛错。
 *   不存在 → 抛 worm-store-timeout，让上层走本地兜底/重试。
 * - inner 没实现 probe → 直接抛 worm-store-timeout。
 *
 * 为什么放装饰层而不是 S3WormStore：
 * - 这是 resilience 策略（超时怎么处理），不是存储本身的职责；
 * - 本地 fs/内存 store 不需要这段逻辑，但装饰层统一在 S3 接入时启用；
 * - probe 作为可选能力挂在 inner 上，本地 store 不实现就自动跳过。
 */
export function withResilience(inner: AsyncWormStore, opts: ResilienceOptions = {}): ResilientWormStore {
  const timeouts = { ...DEFAULT_TIMEOUTS, ...(opts.timeouts ?? {}) };
  const sem = createSemaphore(opts.maxInFlight ?? DEFAULT_MAX_IN_FLIGHT);
  const stats: ResilienceStats = {
    timeoutsByMethod: {},
    putTimeoutButExists: 0,
    queueDepth: 0,
    inFlight: 0,
  };

  async function run<T>(method: keyof typeof timeouts, fn: () => Promise<T>): Promise<T> {
    stats.queueDepth++;
    const release = await sem.acquire();
    stats.queueDepth--;
    stats.inFlight++;
    try {
      return await withTimeout(fn(), timeouts[method], String(method));
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'worm-store-timeout') {
        stats.timeoutsByMethod[method] = (stats.timeoutsByMethod[method] ?? 0) + 1;
      }
      throw e;
    } finally {
      stats.inFlight--;
      release();
    }
  }

  return {
    stats() {
      return {
        timeoutsByMethod: { ...stats.timeoutsByMethod },
        putTimeoutButExists: stats.putTimeoutButExists,
        queueDepth: stats.queueDepth,
        inFlight: stats.inFlight,
      };
    },

    async put(segment: WormSegment): Promise<void> {
      try {
        await run('put', () => inner.put(segment));
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === 'worm-store-timeout' && isProbeable(inner)) {
          // 超时但对象可能已落盘：探测
          let exists = false;
          try {
            exists = await inner.probe(segment.segmentId);
          } catch {
            exists = false;
          }
          if (exists) {
            stats.putTimeoutButExists++;
            return;
          }
        }
        throw e;
      }
    },

    get(segmentId: string) {
      return run('get', () => inner.get(segmentId));
    },
    list() {
      return run('list', () => inner.list());
    },
    countBySigner(keyId: string) {
      return run('countBySigner', () => inner.countBySigner(keyId));
    },
    refresh() {
      return run('refresh', () => inner.refresh());
    },
    newestSeq() {
      return run('newestSeq', () => inner.newestSeq());
    },
  };
}
