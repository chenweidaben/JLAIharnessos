/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - ToolRiskManager 工具风险管理器
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { z } from 'zod';
import { ToolRiskManager } from '@/core/tools/ToolRiskManager';
import { buildMedicalTool } from '@/core/tools/buildMedicalTool';
import { MedicalToolCategory } from '@/types';
import { MedicalAgentError } from '@/core/errors';
import { createMockContext } from './testHelpers';

/**
 * 创建测试用工具
 */
function createTestTool(
  name: string,
  riskLevel: 'low' | 'medium' | 'high',
  overrides: Record<string, unknown> = {},
) {
  return buildMedicalTool({
    name,
    description: `测试工具 ${name}`,
    category: MedicalToolCategory.PATIENT,
    riskLevel,
    requiresAuth: true,
    requiresConfirm: riskLevel !== 'low',
    requiredPermissions: ['test:read'],
    inputSchema: z.object({
      param: z.string().optional(),
    }),
    ...overrides,
    async execute() {
      return { success: true, data: name };
    },
  });
}

describe('ToolRiskManager', () => {
  let riskManager: ToolRiskManager;

  beforeEach(() => {
    riskManager = new ToolRiskManager(false); // 禁用自动清理以便测试
  });

  afterEach(() => {
    riskManager.destroy();
  });

  describe('evaluateConfirmationRequirement', () => {
    it('low 风险工具应返回无需确认', () => {
      const tool = createTestTool('low_tool', 'low');
      const decision = riskManager.evaluateConfirmationRequirement(tool, {});

      expect(decision.requiresConfirmation).toBe(false);
      expect(decision.confirmationLevel).toBe('none');
      expect(decision.requiresCASign).toBe(false);
    });

    it('medium 风险工具应返回单次确认', () => {
      const tool = createTestTool('medium_tool', 'medium');
      const decision = riskManager.evaluateConfirmationRequirement(tool, {});

      expect(decision.requiresConfirmation).toBe(true);
      expect(decision.confirmationLevel).toBe('single');
      expect(decision.requiresCASign).toBe(false);
    });

    it('medium 风险工具配置为无需确认时应返回 none', () => {
      const tool = createTestTool('medium_no_confirm', 'medium', {
        requiresConfirm: false,
      });
      const decision = riskManager.evaluateConfirmationRequirement(tool, {});

      expect(decision.requiresConfirmation).toBe(false);
      expect(decision.confirmationLevel).toBe('none');
    });

    it('high 风险工具应返回双重确认和CA签名', () => {
      const tool = createTestTool('high_tool', 'high');
      const decision = riskManager.evaluateConfirmationRequirement(tool, {});

      expect(decision.requiresConfirmation).toBe(true);
      expect(decision.confirmationLevel).toBe('double');
      expect(decision.requiresCASign).toBe(true);
    });

    it('high 风险工具配置为无需双重确认时应返回 single', () => {
      const tool = createTestTool('high_single', 'high', {
        requiresDoubleConfirm: false,
      });
      const decision = riskManager.evaluateConfirmationRequirement(tool, {});

      expect(decision.confirmationLevel).toBe('single');
    });

    it('high 风险工具配置为无需CA签名时 requiresCASign 应为 false', () => {
      const tool = createTestTool('high_no_ca', 'high', {
        requiresCASign: false,
      });
      const decision = riskManager.evaluateConfirmationRequirement(tool, {});

      expect(decision.requiresCASign).toBe(false);
    });
  });

  describe('generateConfirmationToken', () => {
    it('应生成有效的确认令牌', () => {
      const tool = createTestTool('test_tool', 'medium');
      const context = createMockContext();
      const input = { param: 'test' };

      const tokenInfo = riskManager.generateConfirmationToken(tool, input, context);

      expect(tokenInfo.token).toBeDefined();
      expect(tokenInfo.token.startsWith('conf_')).toBe(true);
      expect(tokenInfo.toolName).toBe('test_tool');
      expect(tokenInfo.riskLevel).toBe('medium');
      expect(tokenInfo.userId).toBe(context.user.userId);
      expect(tokenInfo.sessionId).toBe(context.sessionId);
      expect(tokenInfo.used).toBe(false);
      expect(tokenInfo.expiresAt).toBeGreaterThan(tokenInfo.createdAt);
    });

    it('不同输入应生成不同的输入哈希', () => {
      const tool = createTestTool('test_tool', 'medium');
      const context = createMockContext();

      const token1 = riskManager.generateConfirmationToken(tool, { param: 'a' }, context);
      const token2 = riskManager.generateConfirmationToken(tool, { param: 'b' }, context);

      expect(token1.inputHash).not.toBe(token2.inputHash);
    });
  });

  describe('validateConfirmationToken', () => {
    it('应验证有效的令牌', () => {
      const tool = createTestTool('test_tool', 'medium');
      const context = createMockContext();
      const input = { param: 'test' };

      const tokenInfo = riskManager.generateConfirmationToken(tool, input, context);
      const isValid = riskManager.validateConfirmationToken(tokenInfo.token, tool, input);

      expect(isValid).toBe(true);
    });

    it('不存在的令牌应返回 false', () => {
      const tool = createTestTool('test_tool', 'medium');
      const isValid = riskManager.validateConfirmationToken('invalid_token', tool, {});

      expect(isValid).toBe(false);
    });

    it('已使用的令牌应返回 false', () => {
      const tool = createTestTool('test_tool', 'medium');
      const context = createMockContext();
      const input = { param: 'test' };

      const tokenInfo = riskManager.generateConfirmationToken(tool, input, context);
      riskManager.consumeConfirmationToken(tokenInfo.token);

      const isValid = riskManager.validateConfirmationToken(tokenInfo.token, tool, input);
      expect(isValid).toBe(false);
    });

    it('工具不匹配时应返回 false', () => {
      const tool1 = createTestTool('tool1', 'medium');
      const tool2 = createTestTool('tool2', 'medium');
      const context = createMockContext();
      const input = {};

      const tokenInfo = riskManager.generateConfirmationToken(tool1, input, context);
      const isValid = riskManager.validateConfirmationToken(tokenInfo.token, tool2, input);

      expect(isValid).toBe(false);
    });

    it('输入不匹配时应返回 false', () => {
      const tool = createTestTool('test_tool', 'medium');
      const context = createMockContext();

      const tokenInfo = riskManager.generateConfirmationToken(tool, { param: 'a' }, context);
      const isValid = riskManager.validateConfirmationToken(tokenInfo.token, tool, { param: 'b' });

      expect(isValid).toBe(false);
    });
  });

  describe('consumeConfirmationToken', () => {
    it('应成功消费有效令牌', () => {
      const tool = createTestTool('test_tool', 'medium');
      const context = createMockContext();
      const input = {};

      const tokenInfo = riskManager.generateConfirmationToken(tool, input, context);
      const result = riskManager.consumeConfirmationToken(tokenInfo.token);

      expect(result).toBe(true);
      expect(riskManager.getTokenInfo(tokenInfo.token)?.used).toBe(true);
    });

    it('消费不存在的令牌应返回 false', () => {
      const result = riskManager.consumeConfirmationToken('nonexistent');
      expect(result).toBe(false);
    });

    it('重复消费同一令牌应返回 false', () => {
      const tool = createTestTool('test_tool', 'medium');
      const context = createMockContext();
      const input = {};

      const tokenInfo = riskManager.generateConfirmationToken(tool, input, context);
      expect(riskManager.consumeConfirmationToken(tokenInfo.token)).toBe(true);
      expect(riskManager.consumeConfirmationToken(tokenInfo.token)).toBe(false);
    });
  });

  describe('executeConfirmation', () => {
    it('low 风险工具应直接返回 true', async () => {
      const tool = createTestTool('low_tool', 'low');
      const context = createMockContext();

      const result = await riskManager.executeConfirmation(tool, {}, context);
      expect(result).toBe(true);
    });

    it('medium 风险工具用户确认时应返回 true', async () => {
      const tool = createTestTool('medium_tool', 'medium');
      const context = createMockContext({ confirmResult: true });

      const result = await riskManager.executeConfirmation(tool, {}, context);
      expect(result).toBe(true);
    });

    it('medium 风险工具用户拒绝时应抛出错误', async () => {
      const tool = createTestTool('medium_tool', 'medium');
      const context = createMockContext({ confirmResult: false });

      await expect(
        riskManager.executeConfirmation(tool, {}, context),
      ).rejects.toThrow(MedicalAgentError);
    });

    it('high 风险工具双重确认通过时应返回 true', async () => {
      const tool = createTestTool('high_tool', 'high');
      const context = createMockContext({ confirmResult: true });

      const result = await riskManager.executeConfirmation(tool, {}, context);
      expect(result).toBe(true);
    });

    it('high 风险工具第一重确认被拒绝时应抛出错误', async () => {
      const tool = createTestTool('high_tool', 'high');
      // 使用自定义 context 让第一次确认失败
      const context = createMockContext({ confirmResult: false });

      await expect(
        riskManager.executeConfirmation(tool, {}, context),
      ).rejects.toThrow(MedicalAgentError);
    });
  });

  describe('getTokenInfo', () => {
    it('应返回令牌信息', () => {
      const tool = createTestTool('test_tool', 'medium');
      const context = createMockContext();
      const input = {};

      const tokenInfo = riskManager.generateConfirmationToken(tool, input, context);
      const retrieved = riskManager.getTokenInfo(tokenInfo.token);

      expect(retrieved).toBeDefined();
      expect(retrieved?.toolName).toBe('test_tool');
    });

    it('不存在的令牌应返回 undefined', () => {
      expect(riskManager.getTokenInfo('nonexistent')).toBeUndefined();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('应清理过期的令牌', () => {
      const tool = createTestTool('test_tool', 'medium');
      const context = createMockContext();
      const input = {};

      const tokenInfo = riskManager.generateConfirmationToken(tool, input, context);

      // 手动将令牌设置为过期
      const info = riskManager.getTokenInfo(tokenInfo.token)!;
      (info as { expiresAt: number }).expiresAt = Date.now() - 1000;

      riskManager.cleanupExpiredTokens();

      expect(riskManager.getTokenInfo(tokenInfo.token)).toBeUndefined();
    });

    it('不应清理未过期的令牌', () => {
      const tool = createTestTool('test_tool', 'medium');
      const context = createMockContext();
      const input = {};

      const tokenInfo = riskManager.generateConfirmationToken(tool, input, context);
      riskManager.cleanupExpiredTokens();

      expect(riskManager.getTokenInfo(tokenInfo.token)).toBeDefined();
    });
  });
});
