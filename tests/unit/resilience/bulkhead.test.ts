/**
 * jlmedaios - 异步信号量 / 舱壁隔离测试
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { describe, it, expect } from 'bun:test';
import { ConcurrencyLimiter } from '@/resilience/ConcurrencyLimiter.js';
import { Bulkhead } from '@/resilience/Bulkhead.js';
import { ResilienceErrorCodes } from '@/resilience/CircuitBreaker.js';
import { MedicalAgentError } from '@/core/errors/index.js';

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('ConcurrencyLimiter 信号量', () => {
  it('超出并发时排队，释放后唤醒', async () => {
    const lim = new ConcurrencyLimiter({ pool: 2, name: 'sem' });
    let active = 0;
    let maxActive = 0;
    const worker = async () => {
      const release = await lim.acquire();
      active++;
      maxActive = Math.max(maxActive, active);
      await tick(10);
      active--;
      release();
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    expect(maxActive).toBe(2);
    expect(lim.getMetrics().acquired).toBe(0);
  });

  it('runExclusive 自动释放', async () => {
    const lim = new ConcurrencyLimiter({ pool: 1 });
    let side = 0;
    await lim.runExclusive(async () => {
      side++;
    });
    expect(side).toBe(1);
    expect(lim.available).toBe(1);
  });

  it('获取超时抛受控错误', async () => {
    const lim = new ConcurrencyLimiter({ pool: 1, acquireTimeoutMs: 30 });
    const first = await lim.acquire();
    let code = '';
    await lim.acquire().catch((e: unknown) => {
      code = (e as MedicalAgentError).code;
    });
    expect(code).toBe(ResilienceErrorCodes.CONCURRENCY_TIMEOUT);
    first();
  });

  it('pool 非法时构造即报错', () => {
    expect(() => new ConcurrencyLimiter({ pool: 0 })).toThrow(MedicalAgentError);
  });
});

describe('Bulkhead 舱壁隔离', () => {
  it('reject 策略：并发满时立即拒绝', async () => {
    const bh = new Bulkhead();
    bh.register({ name: 'lab', maxConcurrent: 2, policy: 'reject' });

    let releaseFirst!: () => void;
    const p1 = bh.execute('lab', () => new Promise<void>((r) => (releaseFirst = r)));
    let releaseSecond!: () => void;
    const p2 = bh.execute('lab', () => new Promise<void>((r) => (releaseSecond = r)));

    // 前两个占用 2 个并发，第三个应被拒绝
    let code = '';
    await bh
      .execute('lab', async () => 'x')
      .catch((e: unknown) => {
        code = (e as MedicalAgentError).code;
      });
    expect(code).toBe(ResilienceErrorCodes.BULKHEAD_REJECTED);
    expect(bh.metrics('lab').rejected).toBe(1);

    releaseFirst();
    releaseSecond();
    await Promise.all([p1, p2]);
  });

  it('queue 策略：满时排队不拒绝', async () => {
    const bh = new Bulkhead();
    bh.register({ name: 'dicom', maxConcurrent: 1, policy: 'queue', queueAcquireTimeoutMs: 2000 });
    let order: string[] = [];
    const firstDone = new Promise<void>((r) => {
      void bh.execute('dicom', async () => {
        order.push('a');
        await tick(15);
        r();
      });
    });
    const second = bh.execute('dicom', async () => {
      order.push('b');
    });
    await firstDone;
    await second;
    expect(order).toEqual(['a', 'b']);
  });

  it('未注册资源报错', async () => {
    const bh = new Bulkhead();
    await bh.execute('unknown', async () => 1).catch((e: unknown) => {
      expect(e).toBeInstanceOf(MedicalAgentError);
    });
  });
});
