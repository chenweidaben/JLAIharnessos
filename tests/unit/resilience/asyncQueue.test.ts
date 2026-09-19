/**
 * jlmedaios - 有界异步队列测试
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { describe, it, expect } from 'bun:test';
import { AsyncQueue } from '@/resilience/AsyncQueue.js';
import { ResilienceErrorCodes } from '@/resilience/CircuitBreaker.js';
import { MedicalAgentError } from '@/core/errors/index.js';

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('AsyncQueue 有界队列', () => {
  it('按并发数限流执行，结果顺序返回', async () => {
    const q = new AsyncQueue<number, number>({
      concurrency: 2,
      handler: async (x) => {
        await tick(5);
        return x * 2;
      },
    });
    const results = await Promise.all([q.push(1), q.push(2), q.push(3), q.push(4)]);
    expect(results).toEqual([2, 4, 6, 8]);
    const m = q.getMetrics();
    expect(m.completed).toBe(4);
    expect(m.failed).toBe(0);
  });

  it('reject 策略：队列满时拒绝新任务', async () => {
    let releaseGate!: () => void;
    const gate = new Promise<void>((r) => (releaseGate = r));
    const q = new AsyncQueue<number, number>({
      concurrency: 1,
      maxSize: 1,
      onFull: 'reject',
      handler: async (x) => {
        await gate; // 第一个任务长时间占用唯一 worker
        return x;
      },
    });
    const p1 = q.push(1); // running（占用 worker）
    const p2 = q.push(2); // 进入 buffer（size=1，已满）
    expect(q.size).toBe(1);

    let code = '';
    await q.push(3).catch((e: unknown) => {
      code = (e as MedicalAgentError).code;
    });
    expect(code).toBe(ResilienceErrorCodes.QUEUE_REJECTED);
    expect(q.getMetrics().dropped).toBe(1);

    releaseGate();
    await p1;
    await p2;
    await q.drain();
  });

  it('drop-oldest：满时丢弃最旧任务', async () => {
    let releaseA!: () => void;
    const gate = new Promise<void>((r) => (releaseA = r));
    const q = new AsyncQueue<number, number>({
      concurrency: 1,
      maxSize: 1,
      onFull: 'drop-oldest',
      handler: async (x) => {
        await gate; // A 长时间占用唯一 worker
        return x;
      },
    });
    const pA = q.push(1); // running，占用 worker
    const pB = q.push(2); // 进入 buffer（size=1，已满）

    // 此时再入队 C：应丢弃 buffer 中最旧的 B
    let bRejected = false;
    void pB.catch(() => (bRejected = true));
    const pC = q.push(3);

    // 释放 worker：A 完成，worker 取走 C
    releaseA();
    expect(await pA).toBe(1);
    expect(bRejected).toBe(true);
    expect(await pC).toBe(3);
    await q.drain();
  });

  it('错误被原样抛给 push 的调用方并计入 failed', async () => {
    const q = new AsyncQueue<number, number>({
      concurrency: 2,
      handler: async (x) => {
        if (x < 0) throw new Error('bad');
        return x;
      },
    });
    let msg = '';
    await q.push(-1).catch((e: unknown) => (msg = (e as Error).message));
    expect(msg).toBe('bad');
    expect(q.getMetrics().failed).toBe(1);
  });

  it('close() 后拒绝新任务并排空在途', async () => {
    const q = new AsyncQueue<number, number>({
      concurrency: 2,
      handler: async (x) => {
        await tick(5);
        return x;
      },
    });
    const p1 = q.push(1);
    const p2 = q.push(2);
    await q.close();
    expect(await p1).toBe(1);
    expect(await p2).toBe(2);
    let code = '';
    await q.push(3).catch((e: unknown) => (code = (e as MedicalAgentError).code));
    expect(code).toBe(ResilienceErrorCodes.QUEUE_REJECTED);
  });
});
