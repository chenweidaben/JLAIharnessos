/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { z } from 'zod';

import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import type {
  BuiltMedicalTool,
  MedicalPermissionResult,
  MedicalToolContext,
  MedicalToolDefinition,
  MedicalValidationResult,
} from '@/types';

/**
 * 医疗工具工厂函数
 *
 * 基于 claude-code buildTool() 模式扩展，填充医疗安全默认值（fail-closed）。
 * 封装风险等级检查、权限校验、审计日志、错误处理等横切关注点。
 *
 * 默认值策略（fail-closed）：
 * - `isEnabled` → `true`
 * - `isConcurrencySafe` → `false`（默认串行，医疗安全）
 * - `isReadOnly` → `false`（默认非只读）
 * - `isDestructive` → `false`
 * - `requiresAuth` → `true`（默认需要认证）
 * - `requiresConfirm` → `riskLevel !== 'low'`（medium/high 默认需要确认）
 * - `requiresDoubleConfirm` → `riskLevel === 'high'`（high 默认双重确认）
 * - `requiresAudit` → `true`（默认需要审计）
 * - `validateMedicalInput` → 默认通过
 * - `checkMedicalPermissions` → 默认检查 requiredPermissions
 * - `userFacingName` → 默认返回工具名
 *
 * @param def - 医疗工具定义（部分可选字段可省略，由工厂填充默认值）
 * @returns 构建完成的医疗工具（所有可选字段已填充默认值）
 *
 * @example
 * ```typescript
 * export const queryPatientTool = buildMedicalTool({
 *   name: 'query_patient',
 *   description: '根据患者ID或姓名查询患者基本信息',
 *   category: MedicalToolCategory.PATIENT,
 *   riskLevel: 'low',
 *   requiresAuth: true,
 *   requiresConfirm: false,
 *   requiredPermissions: ['patient:read'],
 *   inputSchema: z.object({
 *     patientId: z.string().optional(),
 *     name: z.string().optional(),
 *   }),
 *   async execute(input, context) {
 *     // 工具执行逻辑
 *     return { success: true, data: [] };
 *   },
 * });
 * ```
 */
export function buildMedicalTool<D extends MedicalToolDefinition>(def: D): BuiltMedicalTool {
  // 验证必要字段
  if (!def.name) {
    throw new MedicalAgentError(ErrorCodes.VALIDATION_ERROR, 'Tool definition requires a name');
  }
  if (!def.description) {
    throw new MedicalAgentError(
      ErrorCodes.VALIDATION_ERROR,
      `Tool '${def.name}' requires a description`,
    );
  }
  if (!def.execute) {
    throw new MedicalAgentError(
      ErrorCodes.VALIDATION_ERROR,
      `Tool '${def.name}' requires an execute function`,
    );
  }
  if (!def.inputSchema) {
    throw new MedicalAgentError(
      ErrorCodes.VALIDATION_ERROR,
      `Tool '${def.name}' requires an inputSchema`,
    );
  }

  const defaults = {
    // 能力标记默认值（fail-closed）
    isEnabled: (): boolean => true,
    isConcurrencySafe: (_input?: unknown): boolean => false,
    isReadOnly: (_input?: unknown): boolean => false,
    isDestructive: (_input?: unknown): boolean => false,

    // 安全默认值
    requiresAuth: true,
    requiresConfirm: def.riskLevel !== 'low',
    requiresDoubleConfirm: def.riskLevel === 'high',
    requiresAudit: true,

    // 医疗校验默认值
    validateMedicalInput: async (
      _input: unknown,
      _context: MedicalToolContext,
    ): Promise<MedicalValidationResult> => ({
      valid: true,
      errors: [],
    }),

    // 医疗权限检查默认值（检查 requiredPermissions）
    checkMedicalPermissions: async (
      _input: unknown,
      context: MedicalToolContext,
    ): Promise<MedicalPermissionResult> => {
      for (const perm of def.requiredPermissions) {
        const result = await context.checkPermission(perm);
        if (!result.allowed) {
          return {
            allowed: false,
            reason: result.reason ?? `缺少权限: ${perm}`,
            requiredPermission: perm,
            suggestedAction: result.suggestedAction,
          };
        }
      }
      return { allowed: true };
    },

    // UI 默认值
    userFacingName: (_input?: unknown): string => def.name,

    // 中断行为默认值
    interruptBehavior: (): 'cancel' | 'block' => 'block',
  };

  // 合并默认值和用户定义（用户定义优先）
  return {
    ...defaults,
    ...def,
    // 确保 requiredPermissions 始终存在
    requiredPermissions: def.requiredPermissions ?? [],
  };
}

/**
 * 验证工具输入参数
 *
 * 使用工具的 inputSchema 进行 Zod 校验，失败时抛出 MedicalAgentError。
 *
 * @param tool - 医疗工具定义
 * @param input - 待校验的输入参数
 * @returns 校验通过的输入参数
 * @throws {MedicalAgentError} 校验失败时抛出
 */
export function validateToolInput(tool: MedicalToolDefinition, input: unknown): unknown {
  const schema = tool.inputSchema;
  const result = schema.safeParse(input);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new MedicalAgentError(
      ErrorCodes.VALIDATION_ERROR,
      `Tool '${tool.name}' input validation failed`,
      {
        toolName: tool.name,
        errors,
        input,
      },
    );
  }

  return result.data;
}

/**
 * 检查工具是否对当前用户可用
 *
 * 综合检查工具启用状态、用户角色、用户职称等条件。
 *
 * @param tool - 医疗工具定义
 * @param context - 工具执行上下文
 * @returns 是否可用及原因
 */
export function checkToolAvailability(
  tool: BuiltMedicalTool,
  context: MedicalToolContext,
): { available: boolean; reason?: string } {
  // 检查工具是否启用
  if (!tool.isEnabled()) {
    return { available: false, reason: 'Tool is disabled' };
  }

  // 检查用户角色
  if (tool.allowedRoles && tool.allowedRoles.length > 0) {
    if (!tool.allowedRoles.includes(context.user.role)) {
      return {
        available: false,
        reason: `User role '${context.user.role}' is not allowed to use this tool`,
      };
    }
  }

  // 检查用户职称
  if (tool.requiredTitles && tool.requiredTitles.length > 0) {
    if (!context.user.title || !tool.requiredTitles.includes(context.user.title)) {
      return {
        available: false,
        reason: `User title '${context.user.title ?? 'none'}' does not meet the requirement`,
      };
    }
  }

  // 检查认证要求
  if (tool.requiresAuth && !context.user.userId) {
    return { available: false, reason: 'Authentication required' };
  }

  return { available: true };
}
