/**
 * 健澜科技杠OS - 结构化控制节点执行器
 *
 * 包含：loop（while / foreach 循环）、parallel（all / any / race 并行）
 * 这两类节点通过 PathRunner.runPath 递归驱动子路径，实现嵌套控制流，
 * 子路径不画回主图，因此工作流主图始终是无环 DAG。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { WorkflowNodeType, type NodeDefinition } from '../dsl/types.js';
import type { NodeExecutor, NodeExecutorContext, NodeOutcome, PathRunResult } from './types.js';
import { assertNotCancelled, WorkflowCancelledError } from './types.js';

/** 硬上限：单次循环最大迭代（配置值也不得超过该天花板，防死循环） */
const HARD_MAX_ITERATIONS = 10_000;

// ============================================================================
// 循环节点
// ============================================================================

export class LoopNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.LOOP;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      mode: 'while' | 'foreach';
      whileCondition?: string;
      collection?: string;
      itemVariable?: string;
      indexVariable?: string;
      bodyEntry: string;
      maxIterations: number;
    };

    if (!cfg.bodyEntry) {
      return { status: 'failed', error: '循环节点缺少 bodyEntry' };
    }
    const maxIterations = Math.min(cfg.maxIterations ?? 100, HARD_MAX_ITERATIONS);

    try {
      if (cfg.mode === 'foreach') {
        return await this.runForeach(cfg, nc);
      }
      return await this.runWhile(cfg, nc, maxIterations);
    } catch (e) {
      if (e instanceof WorkflowCancelledError) throw e;
      return { status: 'failed', error: `循环执行失败: ${(e as Error).message}` };
    }
  }

  /** foreach：遍历集合，串行执行循环体（医疗写操作必须串行以保证安全） */
  private async runForeach(
    cfg: {
      collection?: string;
      itemVariable?: string;
      indexVariable?: string;
      bodyEntry: string;
      maxIterations: number;
    },
    nc: NodeExecutorContext,
  ): Promise<NodeOutcome> {
    const collection = nc.ctx.evaluate(cfg.collection ?? '[]');
    const items = Array.isArray(collection) ? collection : [];
    const itemVar = cfg.itemVariable ?? 'item';
    const indexVar = cfg.indexVariable ?? 'index';
    const iterations = Math.min(items.length, cfg.maxIterations);

    const bodyOutputs: unknown[] = [];
    for (let i = 0; i < iterations; i++) {
      assertNotCancelled(nc.signal);
      nc.ctx.pushScope({ [itemVar]: items[i], [indexVar]: i });
      try {
        const r: PathRunResult = await nc.runner.runPath(cfg.bodyEntry);
        if (r.cancelled) return { status: 'cancelled' };
        bodyOutputs.push(r.output);
      } finally {
        nc.ctx.popScope();
      }
    }

    return {
      status: 'completed',
      selectedPort: 'out',
      output: { iterations, total: items.length, truncated: items.length > iterations, bodyOutputs },
    };
  }

  /** while：条件为真时反复执行循环体 */
  private async runWhile(
    cfg: { whileCondition?: string; bodyEntry: string },
    nc: NodeExecutorContext,
    maxIterations: number,
  ): Promise<NodeOutcome> {
    let iterations = 0;
    const bodyOutputs: unknown[] = [];

    // 先判断条件，避免无条件执行一次
    while (nc.ctx.evaluateBool(cfg.whileCondition ?? 'false')) {
      if (iterations >= maxIterations) {
        return {
          status: 'failed',
          error: `while 循环达到最大迭代次数 ${maxIterations}，疑似死循环`,
        };
      }
      assertNotCancelled(nc.signal);
      const r = await nc.runner.runPath(cfg.bodyEntry);
      if (r.cancelled) return { status: 'cancelled' };
      bodyOutputs.push(r.output);
      iterations++;
    }

    return {
      status: 'completed',
      selectedPort: 'out',
      output: { iterations, bodyOutputs },
    };
  }
}

// ============================================================================
// 并行节点
// ============================================================================

interface BranchOutcome {
  name: string;
  status: 'fulfilled' | 'rejected';
  output?: unknown;
  error?: string;
}

export class ParallelNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.PARALLEL;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      mode: 'all' | 'any' | 'race';
      concurrency: number;
      branches: { name: string; entryNode: string }[];
      requiredSuccessCount?: number;
      timeoutMs?: number;
    };

    if (!cfg.branches || cfg.branches.length === 0) {
      return { status: 'failed', error: '并行节点至少需要一个分支' };
    }

    try {
      let outcomes: BranchOutcome[];
      if (cfg.mode === 'race') {
        outcomes = [await this.runRace(cfg, nc)];
      } else if (cfg.mode === 'any') {
        outcomes = await this.runAny(cfg, nc);
      } else {
        outcomes = await this.runAll(cfg, nc);
      }

      const succeeded = outcomes.filter((o) => o.status === 'fulfilled');
      const failed = outcomes.filter((o) => o.status === 'rejected');
      const output: Record<string, unknown> = {
        mode: cfg.mode,
        branches: Object.fromEntries(outcomes.map((o) => [o.name, o.status === 'fulfilled' ? o.output : { error: o.error }])),
        succeededCount: succeeded.length,
        failedCount: failed.length,
      };

      // all 模式默认要求全部分支成功（除非节点允许部分失败）
      if (cfg.mode === 'all' && failed.length > 0 && !node.errorHandling?.continueOnError) {
        return {
          status: 'failed',
          output,
          error: `并行分支失败: ${failed.map((f) => `${f.name}(${f.error})`).join('; ')}`,
        };
      }
      return { status: 'completed', selectedPort: 'out', output };
    } catch (e) {
      if (e instanceof WorkflowCancelledError) throw e;
      return { status: 'failed', error: `并行执行失败: ${(e as Error).message}` };
    }
  }

  /** all：全部执行（受并发度限制），等待全部结束 */
  private async runAll(
    cfg: { branches: { name: string; entryNode: string }[]; concurrency: number },
    nc: NodeExecutorContext,
  ): Promise<BranchOutcome[]> {
    return this.mapWithConcurrency(cfg.branches, Math.max(1, cfg.concurrency ?? cfg.branches.length), async (b) => {
      const r = await nc.runner.runPath(b.entryNode, b.name);
      if (r.cancelled) throw new WorkflowCancelledError();
      return { name: b.name, status: (r.suspended ? 'rejected' : 'fulfilled') as 'fulfilled' | 'rejected', output: r.output, error: r.suspended ? '人工挂起未在并行中支持' : undefined };
    });
  }

  /** any：等待到 requiredSuccessCount 个成功即汇聚，其余分支结果尽力收集 */
  private async runAny(
    cfg: { branches: { name: string; entryNode: string }[]; requiredSuccessCount?: number },
    nc: NodeExecutorContext,
  ): Promise<BranchOutcome[]> {
    const required = cfg.requiredSuccessCount ?? 1;
    return new Promise<BranchOutcome[]>((resolve, reject) => {
      const outcomes = new Map<string, BranchOutcome>();
      let succeeded = 0;
      let settled = 0;
      let done = false;

      cfg.branches.forEach((b) => {
        nc.runner
          .runPath(b.entryNode, b.name)
          .then((r) => {
            if (done) return;
            outcomes.set(b.name, { name: b.name, status: 'fulfilled', output: r.output });
            succeeded++;
            settled++;
            if (succeeded >= required) {
              done = true;
              resolve(Array.from(outcomes.values()));
            } else if (settled === cfg.branches.length) {
              done = true;
              resolve(Array.from(outcomes.values()));
            }
          })
          .catch((e) => {
            if (done) return;
            outcomes.set(b.name, { name: b.name, status: 'rejected', error: (e as Error).message });
            settled++;
            if (settled === cfg.branches.length) {
              done = true;
              if (succeeded >= required) resolve(Array.from(outcomes.values()));
              else reject(new Error('any 并行：成功分支数不足'));
            }
          });
      });
    });
  }

  /** race：第一个结束的分支（无论成败）即汇聚 */
  private async runRace(
    cfg: { branches: { name: string; entryNode: string }[] },
    nc: NodeExecutorContext,
  ): Promise<BranchOutcome> {
    return new Promise<BranchOutcome>((resolve, reject) => {
      let settled = false;
      cfg.branches.forEach((b) => {
        nc.runner
          .runPath(b.entryNode, b.name)
          .then((r) => {
            if (settled) return;
            settled = true;
            resolve({ name: b.name, status: 'fulfilled', output: r.output });
          })
          .catch((e) => {
            if (settled) return;
            settled = true;
            if (e instanceof WorkflowCancelledError) reject(e);
            else resolve({ name: b.name, status: 'rejected', error: (e as Error).message });
          });
      });
    });
  }

  /** 受限并发的 map（all 模式） */
  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let cursor = 0;

    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index], index);
      }
    });
    await Promise.all(runners);
    return results;
  }
}
