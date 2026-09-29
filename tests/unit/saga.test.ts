/**
 * 健澜科技 jlmedaios - Saga 编排器单元测试（M3-B）
 *
 * 不依赖数据库：验证步骤顺序、失败后逆序补偿、补偿失败升级、无补偿步骤处理。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  runSaga,
  SagaCompensationError,
  SagaExecutionError,
  type SagaStep,
} from '../../src/saga/saga.js';

interface Ctx {
  log: string[];
}

function step(
  name: string,
  fn: (c: Ctx) => void,
  compensate?: (c: Ctx) => void,
): SagaStep<Ctx> {
  return {
    name,
    action: (c) => fn(c),
    compensate: compensate ? (c) => compensate(c) : undefined,
  };
}

describe('Saga 编排器', () => {
  it('全部成功：按顺序执行，无补偿', async () => {
    const ctx: Ctx = { log: [] };
    const result = await runSaga(
      [
        step('a', (c) => c.log.push('a')),
        step('b', (c) => c.log.push('b')),
        step('c', (c) => c.log.push('c')),
      ],
      ctx,
    );
    expect(result.completed).toBe(true);
    expect(ctx.log).toEqual(['a', 'b', 'c']);
    expect(result.executedSteps).toEqual(['a', 'b', 'c']);
    expect(result.compensatedSteps).toEqual([]);
  });

  it('第3步失败：按逆序补偿前两步（b、a）', async () => {
    const ctx: Ctx = { log: [] };
    const promise = runSaga(
      [
        step('a', (c) => c.log.push('a'), (c) => c.log.push('undo-a')),
        step('b', (c) => c.log.push('b'), (c) => c.log.push('undo-b')),
        step('c', () => {
          throw new Error('boom');
        }),
      ],
      ctx,
    );
    await expect(promise).rejects.toBeInstanceOf(SagaExecutionError);
    // 先执行 a、b，再逆序补偿 b、a
    expect(ctx.log).toEqual(['a', 'b', 'undo-b', 'undo-a']);
  });

  it('SagaExecutionError 记录失败步骤与原因', async () => {
    const ctx: Ctx = { log: [] };
    try {
      await runSaga(
        [
          step('a', (c) => c.log.push('a'), (c) => c.log.push('undo-a')),
          step('b', () => {
            throw new Error('explode');
          }),
        ],
        ctx,
      );
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(SagaExecutionError);
      const err = e as SagaExecutionError;
      expect(err.failureStep).toBe('b');
      expect(err.cause).toBeInstanceOf(Error);
      expect(err.execution.compensatedSteps).toEqual(['a']);
    }
  });

  it('补偿也失败：升级为 SagaCompensationError（需人工介入）', async () => {
    const ctx: Ctx = { log: [] };
    const promise = runSaga(
      [
        step('a', (c) => c.log.push('a'), () => {
          throw new Error('compensate-failed');
        }),
        step('b', () => {
          throw new Error('forward-failed');
        }),
      ],
      ctx,
    );
    await expect(promise).rejects.toBeInstanceOf(SagaCompensationError);
  });

  it('无补偿的步骤：失败时跳过，仅补偿有补偿的步骤', async () => {
    const ctx: Ctx = { log: [] };
    const promise = runSaga(
      [
        step('a', (c) => c.log.push('a'), (c) => c.log.push('undo-a')),
        step('b', (c) => c.log.push('b')), // 无补偿
        step('c', () => {
          throw new Error('boom');
        }),
      ],
      ctx,
    );
    await expect(promise).rejects.toBeInstanceOf(SagaExecutionError);
    expect(ctx.log).toEqual(['a', 'b', 'undo-a']);
  });

  it('支持异步 action/compensate', async () => {
    const ctx: Ctx = { log: [] };
    const result = await runSaga(
      [
        {
          name: 'async-a',
          action: async (c) => {
            await Promise.resolve();
            c.log.push('a');
          },
          compensate: async (c) => {
            await Promise.resolve();
            c.log.push('undo-a');
          },
        },
      ],
      ctx,
    );
    expect(result.completed).toBe(true);
    expect(ctx.log).toEqual(['a']);
  });
});
