/**
 * 健澜科技杠OS - 医疗工具适配器
 *
 * 将 medical-tools 的 36 个内置医疗工具（MedicalToolRegistry + MedicalToolContext）
 * 适配为编排层的 IToolInvoker，使工作流的 tool 节点可以像调用普通能力一样
 * 调用医疗工具，同时完整保留医疗安全链：权限校验、风险确认、审计、脱敏。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { recordToolCall } from '@/core/observability/metrics.js';

import type {
  MedicalToolContext,
  MedicalToolRegistry,
  ToolResult,
} from '../../medical-tools/types.js';
import type { IToolInvoker, ToolInvokeInput } from '../engine/runtime.js';

/** 医疗工具上下文提供者：宿主按当前会话/患者构造安全上下文 */
export interface MedicalContextProvider {
  getContext(): MedicalToolContext | Promise<MedicalToolContext>;
}

/**
 * 医疗工具调用适配器
 */
export class MedicalToolInvoker implements IToolInvoker {
  constructor(
    private readonly registry: MedicalToolRegistry,
    private readonly contextProvider: MedicalContextProvider,
  ) {}

  has(toolName: string): boolean {
    return this.registry.has(toolName);
  }

  isReadOnly(toolName: string): boolean {
    const tool = this.registry.get(toolName);
    if (!tool) return false;
    if (typeof tool.isReadOnly === 'function') {
      // isReadOnly 可能依赖输入，无输入时按风险等级推断
      try {
        return tool.riskLevel === 'low';
      } catch {
        return false;
      }
    }
    return tool.riskLevel === 'low';
  }

  riskLevel(toolName: string): 'low' | 'medium' | 'high' | undefined {
    return this.registry.get(toolName)?.riskLevel;
  }

  async invoke(input: ToolInvokeInput): Promise<ToolResult<unknown>> {
    const tool = this.registry.get(input.toolName);
    const emit = (result: 'success' | 'error' | 'denied'): void => {
      recordToolCall({
        tool: input.toolName,
        category: tool?.category ?? 'unknown',
        risk: tool?.riskLevel ?? (input.riskLevel ?? 'unknown'),
        result,
      });
    };
    if (!tool) {
      emit('error');
      return {
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: `医疗工具不存在: ${input.toolName}` },
      };
    }

    const ctx = await this.contextProvider.getContext();

    // 风险确认：节点显式要求，或中高风险工具默认要求（fail-closed）
    const needConfirm =
      input.requireConfirmation ?? (input.riskLevel ?? tool.riskLevel) !== 'low';
    const needDouble = input.requireDoubleConfirm ?? tool.requiresDoubleConfirm === true;

    try {
      if (needDouble) {
        const ok = await ctx.confirmation.requestDoubleConfirm(
          `高风险操作确认：${tool.name}`,
          { toolName: tool.name, input: input.input },
        );
        if (!ok) {
          emit('denied');
          return {
            success: false,
            error: { code: 'CONFIRMATION_DENIED', message: '双人复核未通过，操作已拦截' },
          };
        }
      } else if (needConfirm) {
        const ok = await ctx.confirmation.requestUserConfirm(
          `请确认执行：${tool.name}`,
          { toolName: tool.name, input: input.input },
        );
        if (!ok) {
          emit('denied');
          return {
            success: false,
            error: { code: 'CONFIRMATION_DENIED', message: '用户取消了操作确认' },
          };
        }
      }

      // 执行（工具内部/框架负责权限、校验、审计）
      const r = await tool.execute(input.input, ctx);
      emit(r.success ? 'success' : 'error');
      return r;
    } catch (e) {
      emit('error');
      return {
        success: false,
        error: {
          code: 'TOOL_EXECUTION_EXCEPTION',
          message: e instanceof Error ? e.message : String(e),
        },
      };
    }
  }
}
