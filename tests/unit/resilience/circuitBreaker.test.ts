/**
 * jlmedaios - 熔断器（CircuitBreaker）三态机测试
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { describe, it, expect } from 'bun:test';
import { CircuitBreaker, ResilienceErrorCodes } from '@/resilience/CircuitBreaker.js';
import { MedicalAgentError } from '@/core/errors/index.js';

describe('CircuitBreaker 三态机', () => {
  it('closed 态正常放行，成功不影响状态', async () => {
    const cb = new CircuitBreaker({ name: 't1' });
    let calls = 0;
    const out = await cb.execute(async () => {
      calls++;
      return 'ok';
    });
    expect(out).toBe('ok');
    expect(calls).toBe(1);
    expect(cb.getState()).toBe('closed');
  });

  it('连续失败达到阈值跳闸为 open，并对后续调用 fail-fast', async () => {
    const cb = new CircuitBreaker({ name: 't2', failureThreshold: 3, resetTimeoutMs: 10_000 });
    let calls = 0;
    for (let i = 0; i < 3; i++) {
      await cb.execute(async () => {
        calls++;
        throw new Error('down');
      }).catch(() => {});
    }
    expect(cb.getState()).toBe('open');
    expect(calls).toBe(3);

    // 后续调用不进入 fn，直接抛受控错误
    let guarded = false;
    await cb.execute(async () => {
      guarded = true;
      return 'x';
    }).catch((e: unknown) => {
      expect(e).toBeInstanceOf(MedicalAgentError);
      expect((e as MedicalAgentError).code).toBe(ResilienceErrorCodes.CIRCUIT_OPEN);
    });
    expect(guarded).toBe(false);
    expect(cb.getMetrics().rejected).toBe(1);
  });

  it('冷却到期进入 half-open，探测成功后恢复 closed', async () => {
    let now = 0;
    const cb = new CircuitBreaker({
      name: 't3',
      failureThreshold: 2,
      resetTimeoutMs: 1000,
      halfOpenMaxProbes: 1,
      now: () => now,
    });
    for (let i = 0; i < 2; i++) {
      await cb.execute(async () => {
        throw new Error('down');
      }).catch(() => {});
    }
    expect(cb.getState()).toBe('open');

    // 冷却未到，仍 open
    now = 500;
    expect(cb.getState()).toBe('open');

    // 冷却到期 -> half-open
    now = 1000;
    expect(cb.getState()).toBe('half-open');

    // 探测成功 -> closed
    const r = await cb.execute(async () => 'recovered');
    expect(r).toBe('recovered');
    expect(cb.getState()).toBe('closed');
  });

  it('half-open 探测失败立即重新 open', async () => {
    let now = 0;
    const cb = new CircuitBreaker({
      name: 't4',
      failureThreshold: 2,
      resetTimeoutMs: 1000,
      halfOpenMaxProbes: 1,
      now: () => now,
    });
    for (let i = 0; i < 2; i++) {
      await cb.execute(async () => {
        throw new Error('down');
      }).catch(() => {});
    }
    now = 1000;
    expect(cb.getState()).toBe('half-open');

    await cb.execute(async () => {
      throw new Error('still down');
    }).catch(() => {});
    expect(cb.getState()).toBe('open');
  });

  it('半开探测槽位已满时拒绝额外探测', async () => {
    let now = 0;
    const cb = new CircuitBreaker({
      name: 't5',
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      halfOpenMaxProbes: 1,
      now: () => now,
    });
    await cb.execute(async () => {
      throw new Error('down');
    }).catch(() => {});
    now = 1000;
    expect(cb.getState()).toBe('half-open');

    // 挂起一个探测（不 resolve），占用唯一槽位
    let resolveFirst!: (v: string) => void;
    const first = new Promise<string>((r) => {
      resolveFirst = r;
    });
    const p1 = cb.execute(async () => first);

    // 第二个探测应被拒绝
    let rejectedCode = '';
    await cb
      .execute(async () => 'should not run')
      .catch((e: unknown) => {
        rejectedCode = (e as MedicalAgentError).code;
      });
    expect(rejectedCode).toBe(ResilienceErrorCodes.CIRCUIT_HALF_OPEN_BUSY);

    resolveFirst('ok');
    await p1;
    expect(cb.getState()).toBe('closed');
  });

  it('滚动错误率越阈值触发跳闸', async () => {
    const cb = new CircuitBreaker({
      name: 't6',
      failureThreshold: 100, // 连续失败阈值很高，只靠错误率
      errorRateThreshold: 0.5,
      minimumCalls: 4,
      resetTimeoutMs: 1000,
    });
    // 4 次调用：2 成功 2 失败 -> 错误率 0.5
    for (let i = 0; i < 2; i++) {
      await cb.execute(async () => 'ok').catch(() => {});
      await cb.execute(async () => {
        throw new Error('x');
      }).catch(() => {});
    }
    expect(cb.getState()).toBe('open');
  });

  it('isFailure 可排除业务可接受失败，不计入熔断', async () => {
    const cb = new CircuitBreaker({
      name: 't7',
      failureThreshold: 2,
      isFailure: (err) => !(err instanceof Error) || err.message !== 'not-found',
    });
    for (let i = 0; i < 3; i++) {
      await cb.execute(async () => {
        throw new Error('not-found');
      }).catch(() => {});
    }
    expect(cb.getState()).toBe('closed');
    expect(cb.getMetrics().consecutiveFailures).toBe(0);
  });

  it('超时触发受控错误并计入失败', async () => {
    const cb = new CircuitBreaker({ name: 't8', timeoutMs: 20, failureThreshold: 1 });
    const started = Date.now();
    let code = '';
    await cb
      .execute(() => new Promise((r) => setTimeout(r, 200)))
      .catch((e: unknown) => {
        code = (e as MedicalAgentError).code;
      });
    expect(code).toBe(ResilienceErrorCodes.CIRCUIT_TIMEOUT);
    expect(Date.now() - started).toBeLessThan(150);
    // 超时计为失败 -> 跳闸
    expect(cb.getState()).toBe('open');
  });

  it('reset() 手动恢复 closed', async () => {
    const cb = new CircuitBreaker({ name: 't9', failureThreshold: 1 });
    await cb.execute(async () => {
      throw new Error('x');
    }).catch(() => {});
    expect(cb.getState()).toBe('open');
    cb.reset();
    expect(cb.getState()).toBe('closed');
  });
});
