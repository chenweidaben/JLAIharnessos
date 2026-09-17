/**
 * 健澜科技杠OS - 基础节点执行器
 *
 * 包含：start（开始）、end（结束）、code（安全数据映射）、delay（延时）、condition（条件分支）
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { WorkflowNodeType, type NodeDefinition } from '../dsl/types.js';
import { ExpressionError } from '../engine/expression.js';
import type { NodeExecutor, NodeExecutorContext, NodeOutcome } from './types.js';
import { assertNotCancelled } from './types.js';
import { defaultSleep } from '../engine/runtime.js';

// ============================================================================
// 开始节点
// ============================================================================

export class StartNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.START;

  async execute(_node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    // 开始节点输出即工作流入参
    return { status: 'completed', output: nc.ctx.input, selectedPort: 'out' };
  }
}

// ============================================================================
// 结束节点
// ============================================================================

export class EndNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.END;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as { outputMapping: Record<string, string> };
    const output = nc.ctx.applyMapping(cfg.outputMapping ?? {});
    return { status: 'completed', output, selectedPort: 'out' };
  }
}

// ============================================================================
// 数据映射节点（安全表达式，禁止任意代码）
// ============================================================================

export class CodeNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.CODE;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as { assignments: Record<string, string> };
    try {
      const output = nc.ctx.applyMapping(cfg.assignments ?? {});
      // 同时写入全局变量，供后续节点引用
      nc.ctx.mergeVariables(output);
      return { status: 'completed', output, selectedPort: 'out' };
    } catch (e) {
      if (e instanceof ExpressionError) {
        return { status: 'failed', error: `数据映射表达式非法: ${e.message}` };
      }
      throw e;
    }
  }
}

// ============================================================================
// 延时节点
// ============================================================================

export class DelayNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.DELAY;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as { durationMs: number };
    const sleep = nc.runtime.sleep ?? defaultSleep;
    const duration = Math.max(0, Math.min(cfg.durationMs ?? 0, 60_000)); // 单次延时上限 60s，防滥用
    await sleep(duration);
    assertNotCancelled(nc.signal);
    return { status: 'completed', output: { durationMs: duration, resumedAt: Date.now() }, selectedPort: 'out' };
  }
}

// ============================================================================
// 条件分支节点
// ============================================================================

export class ConditionNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.CONDITION;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      mode: 'if-else' | 'switch';
      switchOn?: string;
      branches?: { name: string; when: string }[];
      cases?: Record<string, string>;
      defaultPort: string;
    };

    try {
      if (cfg.mode === 'switch') {
        const switchValue = nc.ctx.evaluate(cfg.switchOn ?? '');
        const cases = cfg.cases ?? {};
        // 找到值匹配的 case（宽松字符串比较，兼容数字/枚举）
        const matchedKey = Object.keys(cases).find(
          (k) => String(k) === String(switchValue),
        );
        const port = matchedKey !== undefined ? cases[matchedKey] : cfg.defaultPort;
        return {
          status: 'completed',
          output: { switchValue, matchedPort: port },
          selectedPort: port,
        };
      }

      // if-else：按顺序求值第一个为真的分支
      for (const branch of cfg.branches ?? []) {
        if (nc.ctx.evaluateBool(branch.when)) {
          return {
            status: 'completed',
            output: { matchedBranch: branch.name },
            selectedPort: branch.name,
          };
        }
      }
      return {
        status: 'completed',
        output: { matchedBranch: cfg.defaultPort },
        selectedPort: cfg.defaultPort,
      };
    } catch (e) {
      return {
        status: 'failed',
        error: `条件表达式求值失败: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }
}
