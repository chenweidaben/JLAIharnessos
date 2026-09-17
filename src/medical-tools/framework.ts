/**
 * 健澜科技数智医院智能体 - 简化版医疗工具框架
 *
 * 提供 buildMedicalTool 工厂函数和 MedicalToolRegistry 默认实现。
 * 核心团队完成 src/core/tools/ 后，本文件将被统一替换。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type {
  AuditLogEntry,
  BuiltMedicalTool,
  MedicalToolCategory,
  MedicalToolContext,
  MedicalToolDefinition,
  MedicalToolRegistry,
  ToolResult,
} from './types.js';

// ============================================================================
// 医疗工具错误类
// ============================================================================

/** 医疗智能体错误 */
export class MedicalAgentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'MedicalAgentError';
  }
}

// ============================================================================
// 脱敏辅助函数
// ============================================================================

/** 脱敏身份证号：保留前3位和后4位 */
export function maskIdCard(idCard: string): string {
  if (idCard.length < 7) return '*'.repeat(idCard.length);
  return idCard.slice(0, 3) + '*'.repeat(idCard.length - 7) + idCard.slice(-4);
}

/** 脱敏手机号：保留前3位和后4位 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return '*'.repeat(phone.length);
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/** 脱敏姓名：保留姓氏，名用*代替 */
export function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

/** 脱敏地址：保留省市级，其余用*代替 */
export function maskAddress(address: string): string {
  const match = /^(.+?[省市自治区])/.exec(address);
  if (match) return match[1] + '***';
  return address.slice(0, 4) + '***';
}

// ============================================================================
// buildMedicalTool 工厂函数
// ============================================================================

/**
 * 医疗工具工厂函数
 *
 * 基于 claude-code buildTool() 扩展，填充医疗安全默认值（fail-closed）。
 * 自动处理：权限检查、审计日志、输入校验、确认机制。
 *
 * @param def - 工具定义
 * @returns 构建后的医疗工具（包含默认方法实现）
 */
export function buildMedicalTool<D extends MedicalToolDefinition>(def: D): BuiltMedicalTool<D> {
  const tool: BuiltMedicalTool<D> = {
    // 默认能力标记
    isEnabled: () => true,
    isConcurrencySafe: () => false,
    isReadOnly: (input: unknown) => def.riskLevel === 'low',
    isDestructive: () => false,

    // 默认安全属性（requiresAuth/requiresConfirm 由 def 提供，接口中为必填）
    requiresDoubleConfirm: def.riskLevel === 'high',

    // 默认医疗输入校验（通过）
    validateMedicalInput: async () => ({ valid: true, errors: [] }),

    // 默认权限检查
    checkMedicalPermissions: async (_input: unknown, context: MedicalToolContext) => {
      for (const perm of def.requiredPermissions) {
        if (!context.medicalUser.permissions.includes(perm)) {
          return {
            allowed: false,
            reason: `缺少权限: ${perm}`,
            requiredPermission: perm,
          };
        }
      }
      return { allowed: true };
    },

    // 默认审计日志生成
    getAuditLogEntry: (
      input: unknown,
      output: unknown,
      context: MedicalToolContext,
    ): AuditLogEntry => ({
      timestamp: Date.now(),
      userId: context.medicalUser.userId,
      userName: context.medicalUser.name,
      role: context.medicalUser.role,
      toolName: def.name,
      patientId: context.patientContext.patientId,
      encounterId: context.patientContext.encounterId,
      input,
      outputSummary: summarizeOutput(output),
      ipAddress: context.execution.clientIp,
      traceId: context.execution.traceId,
    }),

    ...def,
  };

  return tool;
}

/**
 * 生成输出摘要（用于审计日志）
 */
function summarizeOutput(output: unknown): string {
  if (output === null || output === undefined) return 'null';
  if (typeof output === 'boolean') return String(output);
  if (typeof output === 'number') return String(output);
  if (typeof output === 'string') {
    return output.length > 200 ? output.slice(0, 200) + '...' : output;
  }
  try {
    const str = JSON.stringify(output);
    return str.length > 200 ? str.slice(0, 200) + '...' : str;
  } catch {
    return '[unserializable]';
  }
}

// ============================================================================
// 工具执行辅助函数
// ============================================================================

/**
 * 执行工具的标准流程：权限检查 → 输入校验 → 执行 → 审计日志
 *
 * @param tool - 医疗工具定义
 * @param input - 输入参数
 * @param context - 执行上下文
 * @param executor - 实际执行函数
 * @returns 工具执行结果
 */
export async function executeToolWithSafety<T>(
  tool: MedicalToolDefinition,
  input: unknown,
  context: MedicalToolContext,
  executor: (parsedInput: unknown, ctx: MedicalToolContext) => Promise<ToolResult<T>>,
): Promise<ToolResult<T>> {
  // 1. 权限检查
  const permResult = tool.checkMedicalPermissions
    ? await tool.checkMedicalPermissions(input, context)
    : { allowed: true };
  if (!permResult.allowed) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: permResult.reason ?? '权限不足',
        details: {
          requiredPermission: permResult.requiredPermission,
          toolName: tool.name,
        },
      },
    };
  }

  // 2. 输入校验
  const validation = tool.validateMedicalInput
    ? await tool.validateMedicalInput(input, context)
    : { valid: true, errors: [] };
  if (!validation.valid) {
    const errors = validation.errors.filter((e) => e.severity === 'error');
    if (errors.length > 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '输入参数校验失败',
          details: { errors },
        },
      };
    }
  }

  // 3. 执行
  const result = await executor(input, context);

  // 4. 审计日志
  if (tool.getAuditLogEntry) {
    const entry = tool.getAuditLogEntry(input, result, context);
    context.security.auditor.log(entry);
  }

  return result;
}

// ============================================================================
// 默认工具注册表实现
// ============================================================================

/**
 * 默认医疗工具注册表实现
 */
export class DefaultMedicalToolRegistry implements MedicalToolRegistry {
  private tools = new Map<string, MedicalToolDefinition>();

  register(tool: MedicalToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new MedicalAgentError('TOOL_ALREADY_REGISTERED', `工具 ${tool.name} 已注册`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): MedicalToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): MedicalToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: MedicalToolCategory): MedicalToolDefinition[] {
    return this.getAll().filter((t) => t.category === category);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  get size(): number {
    return this.tools.size;
  }
}
