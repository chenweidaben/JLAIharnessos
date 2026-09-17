/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - MedicalToolRegistry 工具注册中心
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
import { MedicalToolRegistry } from '@/core/tools/MedicalToolRegistry';
import { buildMedicalTool } from '@/core/tools/buildMedicalTool';
import { MedicalToolCategory } from '@/types';
import { MedicalAgentError } from '@/core/errors';
import { createMockUser } from './testHelpers';

/**
 * 创建测试用工具
 */
function createTestTool(
  name: string,
  category: MedicalToolCategory = MedicalToolCategory.PATIENT,
  riskLevel: 'low' | 'medium' | 'high' = 'low',
  allowedRoles?: string[],
) {
  return buildMedicalTool({
    name,
    description: `测试工具 ${name}`,
    category,
    riskLevel,
    requiresAuth: true,
    requiresConfirm: riskLevel !== 'low',
    requiredPermissions: ['test:read'],
    allowedRoles,
    inputSchema: z.object({
      param: z.string().optional(),
    }),
    async execute() {
      return { success: true, data: name };
    },
  });
}

describe('MedicalToolRegistry', () => {
  let registry: MedicalToolRegistry;

  beforeEach(() => {
    registry = new MedicalToolRegistry();
  });

  describe('register', () => {
    it('应成功注册工具', () => {
      const tool = createTestTool('test_tool');
      registry.register(tool);

      expect(registry.size()).toBe(1);
      expect(registry.has('test_tool')).toBe(true);
    });

    it('应拒绝注册重复名称的工具', () => {
      const tool1 = createTestTool('test_tool');
      const tool2 = createTestTool('test_tool');

      registry.register(tool1);

      expect(() => registry.register(tool2)).toThrow(MedicalAgentError);
      expect(() => registry.register(tool2)).toThrow('already registered');
    });

    it('应拒绝注册没有名称的工具', () => {
      const invalidTool = {
        ...createTestTool('valid'),
        name: '',
      };

      expect(() => registry.register(invalidTool)).toThrow(MedicalAgentError);
    });

    it('应支持工具别名', () => {
      const tool = buildMedicalTool({
        name: 'original_name',
        description: '测试别名工具',
        category: MedicalToolCategory.BASIC,
        riskLevel: 'low',
        requiresAuth: false,
        requiresConfirm: false,
        requiredPermissions: [],
        aliases: ['alias1', 'alias2'],
        inputSchema: z.object({}),
        async execute() {
          return { success: true };
        },
      });

      registry.register(tool);

      expect(registry.has('original_name')).toBe(true);
      expect(registry.has('alias1')).toBe(true);
      expect(registry.has('alias2')).toBe(true);
      expect(registry.get('alias1')?.name).toBe('original_name');
    });

    it('应拒绝注册别名冲突的工具', () => {
      const tool1 = buildMedicalTool({
        name: 'tool1',
        description: '工具1',
        category: MedicalToolCategory.BASIC,
        riskLevel: 'low',
        requiresAuth: false,
        requiresConfirm: false,
        requiredPermissions: [],
        aliases: ['shared_alias'],
        inputSchema: z.object({}),
        async execute() {
          return { success: true };
        },
      });

      const tool2 = buildMedicalTool({
        name: 'tool2',
        description: '工具2',
        category: MedicalToolCategory.BASIC,
        riskLevel: 'low',
        requiresAuth: false,
        requiresConfirm: false,
        requiredPermissions: [],
        aliases: ['shared_alias'],
        inputSchema: z.object({}),
        async execute() {
          return { success: true };
        },
      });

      registry.register(tool1);
      expect(() => registry.register(tool2)).toThrow(MedicalAgentError);
      expect(() => registry.register(tool2)).toThrow('already in use');
    });
  });

  describe('registerAll', () => {
    it('应批量注册多个工具', () => {
      const tools = [
        createTestTool('tool1'),
        createTestTool('tool2'),
        createTestTool('tool3'),
      ];

      registry.registerAll(tools);

      expect(registry.size()).toBe(3);
      expect(registry.has('tool1')).toBe(true);
      expect(registry.has('tool2')).toBe(true);
      expect(registry.has('tool3')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('应成功注销工具', () => {
      const tool = createTestTool('test_tool');
      registry.register(tool);
      expect(registry.size()).toBe(1);

      registry.unregister('test_tool');
      expect(registry.size()).toBe(0);
      expect(registry.has('test_tool')).toBe(false);
    });

    it('应通过别名注销工具', () => {
      const tool = buildMedicalTool({
        name: 'original',
        description: '测试',
        category: MedicalToolCategory.BASIC,
        riskLevel: 'low',
        requiresAuth: false,
        requiresConfirm: false,
        requiredPermissions: [],
        aliases: ['my_alias'],
        inputSchema: z.object({}),
        async execute() {
          return { success: true };
        },
      });

      registry.register(tool);
      registry.unregister('my_alias');

      expect(registry.has('original')).toBe(false);
      expect(registry.has('my_alias')).toBe(false);
    });

    it('注销不存在的工具应抛出错误', () => {
      expect(() => registry.unregister('nonexistent')).toThrow(MedicalAgentError);
      expect(() => registry.unregister('nonexistent')).toThrow('not found');
    });
  });

  describe('get / getOrThrow', () => {
    it('get 应返回已注册的工具', () => {
      const tool = createTestTool('test_tool');
      registry.register(tool);

      const result = registry.get('test_tool');
      expect(result).toBeDefined();
      expect(result?.name).toBe('test_tool');
    });

    it('get 未找到时应返回 undefined', () => {
      const result = registry.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('getOrThrow 应返回已注册的工具', () => {
      const tool = createTestTool('test_tool');
      registry.register(tool);

      const result = registry.getOrThrow('test_tool');
      expect(result.name).toBe('test_tool');
    });

    it('getOrThrow 未找到时应抛出错误', () => {
      expect(() => registry.getOrThrow('nonexistent')).toThrow(MedicalAgentError);
    });
  });

  describe('list / listByCategory', () => {
    it('list 应返回所有已注册工具', () => {
      registry.registerAll([
        createTestTool('tool1', MedicalToolCategory.PATIENT),
        createTestTool('tool2', MedicalToolCategory.EMR),
        createTestTool('tool3', MedicalToolCategory.LAB),
      ]);

      const all = registry.list();
      expect(all.length).toBe(3);
    });

    it('list 按分类过滤应返回对应工具', () => {
      registry.registerAll([
        createTestTool('patient_tool', MedicalToolCategory.PATIENT),
        createTestTool('emr_tool', MedicalToolCategory.EMR),
        createTestTool('patient_tool2', MedicalToolCategory.PATIENT),
      ]);

      const patientTools = registry.list(MedicalToolCategory.PATIENT);
      expect(patientTools.length).toBe(2);
      expect(patientTools.every((t) => t.category === MedicalToolCategory.PATIENT)).toBe(true);
    });

    it('listByCategory 应返回对应分类的工具', () => {
      registry.registerAll([
        createTestTool('lab1', MedicalToolCategory.LAB),
        createTestTool('lab2', MedicalToolCategory.LAB),
        createTestTool('emr1', MedicalToolCategory.EMR),
      ]);

      const labTools = registry.listByCategory(MedicalToolCategory.LAB);
      expect(labTools.length).toBe(2);
    });

    it('空分类应返回空数组', () => {
      const result = registry.listByCategory(MedicalToolCategory.CDS);
      expect(result).toEqual([]);
    });
  });

  describe('listCategories', () => {
    it('应返回所有已使用的分类', () => {
      registry.registerAll([
        createTestTool('tool1', MedicalToolCategory.PATIENT),
        createTestTool('tool2', MedicalToolCategory.EMR),
        createTestTool('tool3', MedicalToolCategory.PATIENT),
      ]);

      const categories = registry.listCategories();
      expect(categories).toContain(MedicalToolCategory.PATIENT);
      expect(categories).toContain(MedicalToolCategory.EMR);
      expect(categories.length).toBe(2);
    });
  });

  describe('getAvailableToolsForUser', () => {
    it('应返回用户角色允许的工具', () => {
      registry.registerAll([
        createTestTool('doctor_tool', MedicalToolCategory.PATIENT, 'low', ['doctor']),
        createTestTool('nurse_tool', MedicalToolCategory.EMR, 'low', ['nurse']),
        createTestTool('all_tool', MedicalToolCategory.BASIC, 'low'),
      ]);

      const doctor = createMockUser({ role: 'doctor' });
      const available = registry.getAvailableToolsForUser(doctor);

      expect(available.length).toBe(2);
      expect(available.map((t) => t.name)).toContain('doctor_tool');
      expect(available.map((t) => t.name)).toContain('all_tool');
      expect(available.map((t) => t.name)).not.toContain('nurse_tool');
    });

    it('应过滤掉未启用的工具', () => {
      const disabledTool = buildMedicalTool({
        name: 'disabled_tool',
        description: '已禁用工具',
        category: MedicalToolCategory.BASIC,
        riskLevel: 'low',
        requiresAuth: false,
        requiresConfirm: false,
        requiredPermissions: [],
        inputSchema: z.object({}),
        isEnabled: () => false,
        async execute() {
          return { success: true };
        },
      });

      registry.register(disabledTool);
      registry.register(createTestTool('enabled_tool'));

      const user = createMockUser();
      const available = registry.getAvailableToolsForUser(user);

      expect(available.length).toBe(1);
      expect(available[0].name).toBe('enabled_tool');
    });
  });

  describe('getToolMetadata / getAllToolMetadata', () => {
    it('getToolMetadata 应返回工具元数据', () => {
      const tool = createTestTool('test_tool', MedicalToolCategory.PATIENT, 'medium');
      registry.register(tool);

      const metadata = registry.getToolMetadata('test_tool');
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('test_tool');
      expect(metadata?.category).toBe(MedicalToolCategory.PATIENT);
      expect(metadata?.riskLevel).toBe('medium');
    });

    it('getToolMetadata 未找到时应返回 undefined', () => {
      expect(registry.getToolMetadata('nonexistent')).toBeUndefined();
    });

    it('getAllToolMetadata 应返回所有工具元数据', () => {
      registry.registerAll([
        createTestTool('tool1', MedicalToolCategory.PATIENT, 'low'),
        createTestTool('tool2', MedicalToolCategory.EMR, 'high'),
      ]);

      const allMetadata = registry.getAllToolMetadata();
      expect(allMetadata.length).toBe(2);
      expect(allMetadata[0]).toHaveProperty('name');
      expect(allMetadata[0]).toHaveProperty('description');
      expect(allMetadata[0]).toHaveProperty('category');
      expect(allMetadata[0]).toHaveProperty('riskLevel');
    });
  });

  describe('clear', () => {
    it('应清空所有已注册工具', () => {
      registry.registerAll([
        createTestTool('tool1'),
        createTestTool('tool2'),
      ]);
      expect(registry.size()).toBe(2);

      registry.clear();
      expect(registry.size()).toBe(0);
      expect(registry.list()).toEqual([]);
    });
  });
});
