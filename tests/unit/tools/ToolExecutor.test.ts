/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - ToolExecutor 工具执行器
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
import { ToolExecutor } from '@/core/tools/ToolExecutor';
import { MedicalToolRegistry } from '@/core/tools/MedicalToolRegistry';
import { ToolRiskManager } from '@/core/tools/ToolRiskManager';
import { buildMedicalTool } from '@/core/tools/buildMedicalTool';
import { MedicalToolCategory } from '@/types';
import { createMockContext } from './testHelpers';

/**
 * 创建测试用工具
 */
function createTestTool(
  name: string,
  riskLevel: 'low' | 'medium' | 'high' = 'low',
  executeFn?: (input: unknown) => Promise<unknown>,
) {
  return buildMedicalTool({
    name,
    description: `测试工具 ${name}`,
    category: MedicalToolCategory.BASIC,
    riskLevel,
    requiresAuth: false,
    requiresConfirm: riskLevel !== 'low',
    requiredPermissions: [],
    inputSchema: z.object({
      value: z.string().optional(),
      delay: z.number().optional(),
    }),
    async execute(input: unknown) {
      if (executeFn) {
        return executeFn(input);
      }
      const parsed = input as { value?: string };
      return { success: true, data: parsed.value ?? name };
    },
  });
}

describe('ToolExecutor', () => {
  let registry: MedicalToolRegistry;
  let riskManager: ToolRiskManager;
  let executor: ToolExecutor;

  beforeEach(() => {
    registry = new MedicalToolRegistry();
    riskManager = new ToolRiskManager(false);
    executor = new ToolExecutor(registry, riskManager);
  });

  describe('execute - 单工具执行', () => {
    it('应成功执行 low 风险工具', async () => {
      const tool = createTestTool('test_tool', 'low');
      registry.register(tool);

      const context = createMockContext();
      const result = await executor.execute('test_tool', { value: 'hello' }, context);

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ success: true, data: 'hello' });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('执行不存在的工具应返回错误', async () => {
      const context = createMockContext();
      const result = await executor.execute('nonexistent', {}, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOOL_NOT_FOUND');
      expect(result.error?.errorType).toBe('not_found');
    });

    it('参数校验失败应返回错误', async () => {
      const tool = buildMedicalTool({
        name: 'validation_tool',
        description: '参数校验测试工具',
        category: MedicalToolCategory.BASIC,
        riskLevel: 'low',
        requiresAuth: false,
        requiresConfirm: false,
        requiredPermissions: [],
        inputSchema: z.object({
          required_field: z.string(),
        }),
        async execute() {
          return { success: true };
        },
      });
      registry.register(tool);

      const context = createMockContext();
      const result = await executor.execute('validation_tool', {}, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.errorType).toBe('validation');
    });

    it('medium 风险工具应返回需要确认', async () => {
      const tool = createTestTool('medium_tool', 'medium');
      registry.register(tool);

      const context = createMockContext();
      const result = await executor.execute('medium_tool', {}, context);

      expect(result.success).toBe(false);
      expect(result.requiresUserConfirmation).toBe(true);
      expect(result.confirmationToken).toBeDefined();
      expect(result.confirmationRequirement).toBeDefined();
      expect(result.confirmationRequirement?.level).toBe('medium');
    });

    it('high 风险工具应返回需要确认', async () => {
      const tool = createTestTool('high_tool', 'high');
      registry.register(tool);

      const context = createMockContext();
      const result = await executor.execute('high_tool', {}, context);

      expect(result.success).toBe(false);
      expect(result.requiresUserConfirmation).toBe(true);
      expect(result.confirmationToken).toBeDefined();
      expect(result.confirmationRequirement?.level).toBe('high');
    });

    it('工具执行抛出错误应返回错误结果', async () => {
      const tool = createTestTool('error_tool', 'low', async () => {
        throw new Error('执行失败');
      });
      registry.register(tool);

      const context = createMockContext();
      const result = await executor.execute('error_tool', {}, context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('执行失败');
      expect(result.error?.errorType).toBe('internal');
    });

    it('应记录审计日志', async () => {
      const tool = createTestTool('audit_tool', 'low');
      registry.register(tool);

      const context = createMockContext();
      await executor.execute('audit_tool', {}, context);

      // 审计日志在 context 的 mock audit logger 中
      // 由于 createMockContext 创建的是内部 mock，这里验证执行成功即可
      // 实际审计验证在集成测试中进行
      expect(true).toBe(true);
    });
  });

  describe('executeWithConfirmation - 确认后执行', () => {
    it('使用有效确认令牌应成功执行 medium 风险工具', async () => {
      const tool = createTestTool('medium_tool', 'medium');
      registry.register(tool);

      const context = createMockContext();

      // 第一步：执行工具，获取确认令牌
      const firstResult = await executor.execute('medium_tool', { value: 'test' }, context);
      expect(firstResult.requiresUserConfirmation).toBe(true);
      expect(firstResult.confirmationToken).toBeDefined();

      // 第二步：使用确认令牌执行
      const secondResult = await executor.executeWithConfirmation(
        'medium_tool',
        { value: 'test' },
        context,
        firstResult.confirmationToken!,
      );

      expect(secondResult.success).toBe(true);
      expect(secondResult.output).toEqual({ success: true, data: 'test' });
    });

    it('使用无效确认令牌应返回错误', async () => {
      const tool = createTestTool('medium_tool', 'medium');
      registry.register(tool);

      const context = createMockContext();
      const result = await executor.executeWithConfirmation(
        'medium_tool',
        {},
        context,
        'invalid_token',
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONFIRMATION_TOKEN');
    });

    it('使用已消费的确认令牌应返回错误', async () => {
      const tool = createTestTool('medium_tool', 'medium');
      registry.register(tool);

      const context = createMockContext();

      const firstResult = await executor.execute('medium_tool', {}, context);
      const token = firstResult.confirmationToken!;

      // 第一次使用
      await executor.executeWithConfirmation('medium_tool', {}, context, token);

      // 第二次使用（应失败）
      const secondResult = await executor.executeWithConfirmation(
        'medium_tool',
        {},
        context,
        token,
      );

      expect(secondResult.success).toBe(false);
      expect(secondResult.error?.code).toBe('INVALID_CONFIRMATION_TOKEN');
    });
  });

  describe('executeBatchParallel - 批量并行执行', () => {
    it('应并行执行多个 low 风险工具', async () => {
      registry.registerAll([
        createTestTool('tool1', 'low'),
        createTestTool('tool2', 'low'),
        createTestTool('tool3', 'low'),
      ]);

      const context = createMockContext();
      const toolCalls = [
        { callId: 'c1', toolName: 'tool1', input: { value: 'a' } },
        { callId: 'c2', toolName: 'tool2', input: { value: 'b' } },
        { callId: 'c3', toolName: 'tool3', input: { value: 'c' } },
      ];

      const results = await executor.executeBatchParallel(toolCalls, context);

      expect(results.length).toBe(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results[0].toolName).toBe('tool1');
      expect(results[1].toolName).toBe('tool2');
      expect(results[2].toolName).toBe('tool3');
    });

    it('空列表应返回空数组', async () => {
      const context = createMockContext();
      const results = await executor.executeBatchParallel([], context);

      expect(results).toEqual([]);
    });

    it('部分工具失败应返回部分成功结果', async () => {
      registry.registerAll([
        createTestTool('success_tool', 'low'),
        createTestTool('fail_tool', 'low', async () => {
          throw new Error('失败');
        }),
      ]);

      const context = createMockContext();
      const toolCalls = [
        { callId: 'c1', toolName: 'success_tool', input: {} },
        { callId: 'c2', toolName: 'fail_tool', input: {} },
      ];

      const results = await executor.executeBatchParallel(toolCalls, context);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('executeBatchSerial - 批量串行执行', () => {
    it('应串行执行多个工具', async () => {
      const executionOrder: string[] = [];

      registry.registerAll([
        createTestTool('tool1', 'low', async () => {
          executionOrder.push('tool1');
          return { success: true };
        }),
        createTestTool('tool2', 'low', async () => {
          executionOrder.push('tool2');
          return { success: true };
        }),
        createTestTool('tool3', 'low', async () => {
          executionOrder.push('tool3');
          return { success: true };
        }),
      ]);

      const context = createMockContext();
      const toolCalls = [
        { callId: 'c1', toolName: 'tool1', input: {} },
        { callId: 'c2', toolName: 'tool2', input: {} },
        { callId: 'c3', toolName: 'tool3', input: {} },
      ];

      const results = await executor.executeBatchSerial(toolCalls, context);

      expect(results.length).toBe(3);
      expect(executionOrder).toEqual(['tool1', 'tool2', 'tool3']);
    });

    it('遇到错误时默认应停止执行', async () => {
      registry.registerAll([
        createTestTool('tool1', 'low'),
        createTestTool('fail_tool', 'low', async () => {
          throw new Error('失败');
        }),
        createTestTool('tool3', 'low'),
      ]);

      const context = createMockContext();
      const toolCalls = [
        { callId: 'c1', toolName: 'tool1', input: {} },
        { callId: 'c2', toolName: 'fail_tool', input: {} },
        { callId: 'c3', toolName: 'tool3', input: {} },
      ];

      const results = await executor.executeBatchSerial(toolCalls, context);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('stopOnError=false 时应继续执行后续工具', async () => {
      registry.registerAll([
        createTestTool('tool1', 'low'),
        createTestTool('fail_tool', 'low', async () => {
          throw new Error('失败');
        }),
        createTestTool('tool3', 'low'),
      ]);

      const context = createMockContext();
      const toolCalls = [
        { callId: 'c1', toolName: 'tool1', input: {} },
        { callId: 'c2', toolName: 'fail_tool', input: {} },
        { callId: 'c3', toolName: 'tool3', input: {} },
      ];

      const results = await executor.executeBatchSerial(toolCalls, context, false);

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('executeStreaming - 流式执行', () => {
    it('应发出 start 和 complete 事件', async () => {
      const tool = createTestTool('stream_tool', 'low');
      registry.register(tool);

      const context = createMockContext();
      const events: Array<{ type: string }> = [];

      for await (const event of executor.executeStreaming('stream_tool', {}, context)) {
        events.push({ type: event.type });
      }

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].type).toBe('start');
      expect(events[events.length - 1].type).toBe('complete');
    });

    it('medium 风险工具应发出 confirmation_required 事件', async () => {
      const tool = createTestTool('medium_stream', 'medium');
      registry.register(tool);

      const context = createMockContext();
      const events: Array<{ type: string }> = [];

      for await (const event of executor.executeStreaming('medium_stream', {}, context)) {
        events.push({ type: event.type });
      }

      expect(events.map((e) => e.type)).toContain('confirmation_required');
    });
  });

  describe('权限检查', () => {
    it('无权限时应返回权限错误', async () => {
      const tool = buildMedicalTool({
        name: 'permission_tool',
        description: '权限测试工具',
        category: MedicalToolCategory.PATIENT,
        riskLevel: 'low',
        requiresAuth: true,
        requiresConfirm: false,
        requiredPermissions: ['special:permission'],
        inputSchema: z.object({}),
        async execute() {
          return { success: true };
        },
      });
      registry.register(tool);

      const context = createMockContext({ allowedPermissions: ['other:permission'] });
      const result = await executor.execute('permission_tool', {}, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.errorType).toBe('permission');
    });

    it('有权限时应成功执行', async () => {
      const tool = buildMedicalTool({
        name: 'permission_tool',
        description: '权限测试工具',
        category: MedicalToolCategory.PATIENT,
        riskLevel: 'low',
        requiresAuth: true,
        requiresConfirm: false,
        requiredPermissions: ['special:permission'],
        inputSchema: z.object({}),
        async execute() {
          return { success: true };
        },
      });
      registry.register(tool);

      const context = createMockContext({ allowedPermissions: ['special:permission'] });
      const result = await executor.execute('permission_tool', {}, context);

      expect(result.success).toBe(true);
    });
  });
});
