/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - TaskQueue 任务队列
 * 验证：优先级调度、并发控制、任务依赖、状态流转。
 */

import { describe, it, expect } from 'bun:test';
import { TaskQueue } from '@/core/tasks/TaskQueue';

/** 异步 sleep */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('TaskQueue', () => {
  it('应按优先级调度任务（stat > urgent > routine）', async () => {
    const q = new TaskQueue(5);
    const order: string[] = [];
    q.enqueue({
      name: 'routine-task',
      priority: 'routine',
      handler: async () => { order.push('routine'); return 1; },
    });
    q.enqueue({
      name: 'stat-task',
      priority: 'stat',
      handler: async () => { order.push('stat'); return 1; },
    });
    q.enqueue({
      name: 'urgent-task',
      priority: 'urgent',
      handler: async () => { order.push('urgent'); return 1; },
    });
    await sleep(20);
    expect(order).toEqual(['stat', 'urgent', 'routine']);
  });

  it('应限制最大并发数', async () => {
    const q = new TaskQueue(2);
    let concurrent = 0;
    let maxConcurrent = 0;
    const handlers = Array.from({ length: 4 }, () =>
      q.enqueue({
        name: 'p',
        priority: 'routine',
        handler: async () => {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await sleep(10);
          concurrent--;
          return true;
        },
      }),
    );
    await sleep(60);
    expect(maxConcurrent).toBe(2);
    for (const id of handlers) {
      expect(q.getTask(id)!.state).toBe('completed');
    }
  });

  it('任务依赖应等待上游完成后才执行下游', async () => {
    const q = new TaskQueue(5);
    const log: string[] = [];
    const depId = q.enqueue({
      name: 'upstream',
      priority: 'routine',
      handler: async () => { log.push('upstream'); return 'done'; },
    });
    q.enqueue({
      name: 'downstream',
      priority: 'routine',
      dependsOn: [depId],
      handler: async () => { log.push('downstream'); return 'ok'; },
    });
    await sleep(30);
    expect(log).toEqual(['upstream', 'downstream']);
  });

  it('失败任务应记录错误且不影响其他任务', async () => {
    const q = new TaskQueue(5);
    const failId = q.enqueue({
      name: 'will-fail',
      priority: 'routine',
      handler: async () => { throw new Error('失败'); },
    });
    const okId = q.enqueue({
      name: 'will-ok',
      priority: 'routine',
      handler: async () => 'ok',
    });
    await sleep(20);
    expect(q.getTask(failId)!.state).toBe('failed');
    expect(q.getTask(failId)!.error).toContain('失败');
    expect(q.getTask(okId)!.state).toBe('completed');
  });

  it('pending 状态任务应可取消', async () => {
    const q = new TaskQueue(1);
    // 先占住唯一并发槽
    q.enqueue({
      name: 'blocker',
      priority: 'routine',
      handler: async () => { await sleep(50); return true; },
    });
    const id = q.enqueue({
      name: 'to-cancel',
      priority: 'routine',
      handler: async () => 'never',
    });
    // 等待 to-cancel 入队为 pending
    await sleep(5);
    expect(q.cancel(id)).toBe(true);
    expect(q.getTask(id)!.state).toBe('cancelled');
  });

  it('事件订阅应收到状态通知', async () => {
    const q = new TaskQueue(3);
    const events: string[] = [];
    q.on((e) => events.push(e.type));
    q.enqueue({
      name: 'evt',
      priority: 'routine',
      handler: async () => 1,
    });
    await sleep(20);
    expect(events).toContain('enqueued');
    expect(events).toContain('started');
    expect(events).toContain('completed');
  });
});
