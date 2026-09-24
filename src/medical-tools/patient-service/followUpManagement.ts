/**
 * 健澜科技数智医院智能体 - 随访管理工具
 *
 * 工具名：follow_up_management
 * 功能：查询患者随访计划；当传入plan时新建随访计划
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { MOCK_PATIENTS } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';
import { FOLLOW_UP_STORE, type MockFollowUp } from './patientServiceData.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const FollowUpManagementInput = z.object({
  patientId: z.string().describe('患者ID'),
  followUpType: z
    .enum(['慢病随访', '术后随访', '出院随访', '用药随访', '专科随访'])
    .optional()
    .describe('随访类型（筛选或新建时指定）'),
  plan: z.string().optional().describe('随访计划内容；传入即新建随访计划，缺省则查询现有计划'),
  nextFollowUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为YYYY-MM-DD')
    .optional()
    .describe('下次随访日期（新建时使用，缺省为今日+30天）'),
  status: z
    .enum(['全部', '待随访', '进行中', '已完成', '已逾期', '已取消'])
    .default('全部')
    .describe('状态筛选（仅查询模式生效）'),
});

const FollowUpItemSchema = z.object({
  followUpId: z.string(),
  followUpType: z.string(),
  plan: z.string(),
  nextFollowUpDate: z.string(),
  status: z.string(),
  responsible: z.string(),
  lastContactAt: z.string().nullable(),
  remark: z.string().nullable(),
});

const FollowUpManagementOutput = z.object({
  success: z.boolean(),
  mode: z.enum(['created', 'queried']).describe('本次操作模式：新建/查询'),
  patientId: z.string(),
  total: z.number(),
  followUps: z.array(FollowUpItemSchema),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 随访管理
 *
 * - 传入 plan：为患者新建一条随访计划（nextFollowUpDate 缺省为今日+30天）。
 * - 未传 plan：按 patientId、followUpType、status 查询现有随访计划。
 *
 * @param input - 随访管理参数
 * @param context - 工具执行上下文
 * @returns 随访计划列表
 */
async function executeFollowUpManagement(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = FollowUpManagementInput.parse(input);

  const patient = MOCK_PATIENTS.find((p) => p.patientId === parsed.patientId);
  if (!patient) {
    return {
      success: false,
      error: {
        code: 'PATIENT_NOT_FOUND',
        message: `患者 ${parsed.patientId} 不存在`,
      },
    };
  }

  // ---- 新建模式 ----
  if (parsed.plan && parsed.plan.trim().length > 0) {
    if (!parsed.followUpType) {
      return {
        success: false,
        error: {
          code: 'TYPE_REQUIRED',
          message: '新建随访计划时必须指定 followUpType',
        },
      };
    }
    const next =
      parsed.nextFollowUpDate ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const record: MockFollowUp = {
      followUpId: `FU${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      patientId: parsed.patientId,
      followUpType: parsed.followUpType,
      plan: parsed.plan.trim(),
      nextFollowUpDate: next,
      status: '待随访',
      responsible: `${patient.department}-${context.medicalUser.name}`,
      createdAt: new Date().toISOString(),
      lastContactAt: null,
      remark: null,
    };
    FOLLOW_UP_STORE.push(record);

    return {
      success: true,
      data: {
        success: true,
        mode: 'created',
        patientId: parsed.patientId,
        total: 1,
        followUps: [record],
        _demoMode: true,
      },
    };
  }

  // ---- 查询模式 ----
  let results = FOLLOW_UP_STORE.filter((f) => f.patientId === parsed.patientId);
  if (parsed.followUpType) {
    results = results.filter((f) => f.followUpType === parsed.followUpType);
  }
  if (parsed.status && parsed.status !== '全部') {
    results = results.filter((f) => f.status === parsed.status);
  }
  results = [...results].sort((a, b) => a.nextFollowUpDate.localeCompare(b.nextFollowUpDate));

  return {
    success: true,
    data: {
      success: true,
      mode: 'queried',
      patientId: parsed.patientId,
      total: results.length,
      followUps: results,
      _demoMode: true,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const followUpManagementTool = buildMedicalTool({
  name: 'follow_up_management',
  description:
    '随访管理：按患者、随访类型（慢病/术后/出院/用药/专科）、状态查询随访计划；传入plan与followUpType时新建随访计划（下次随访日期缺省为今日+30天）。',
  category: MedicalToolCategory.PATIENT,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['followup:read', 'followup:write'],
  inputSchema: FollowUpManagementInput,
  outputSchema: FollowUpManagementOutput,
  execute: executeFollowUpManagement,
  isReadOnly: (input: unknown) => {
    // 仅查询模式只读；新建模式（有plan）非只读
    const parsed = FollowUpManagementInput.safeParse(input);
    return parsed.success && !parsed.data.plan;
  },
  isConcurrencySafe: () => false,
  userFacingName: () => '随访管理',
  getActivityDescription: (input: unknown) => {
    const parsed = FollowUpManagementInput.safeParse(input);
    if (parsed.success) {
      return parsed.data.plan
        ? `新建随访计划: 患者${parsed.data.patientId}`
        : `查询随访: 患者${parsed.data.patientId}`;
    }
    return '随访管理';
  },
});

export type FollowUpManagementInputType = z.infer<typeof FollowUpManagementInput>;
export type FollowUpManagementOutputType = z.infer<typeof FollowUpManagementOutput>;
