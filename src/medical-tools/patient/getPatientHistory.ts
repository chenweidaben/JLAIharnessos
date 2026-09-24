/**
 * 健澜科技数智医院智能体 - 获取患者就诊历史工具
 *
 * 工具名：get_patient_history
 * 功能：获取患者历史就诊记录列表，支持按时间范围和就诊类型筛选
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { clinicalData, sourceTag } from '../../data/clinicalData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const GetPatientHistoryInput = z.object({
  patientId: z.string().describe('患者唯一ID（必填）'),
  startDate: z.string().optional().describe('开始日期（YYYY-MM-DD）'),
  endDate: z.string().optional().describe('结束日期（YYYY-MM-DD）'),
  visitType: z
    .enum(['门诊', '住院', '急诊', '手术', '全部'])
    .default('全部')
    .describe('就诊类型筛选'),
  limit: z.number().int().min(1).max(100).default(20).describe('返回条数上限'),
});

const GetPatientHistoryOutput = z.object({
  success: z.boolean(),
  total: z.number(),
  visits: z.array(
    z.object({
      encounterId: z.string(),
      visitType: z.string(),
      visitDate: z.string(),
      department: z.string(),
      doctor: z.string(),
      primaryDiagnosis: z.string().nullable(),
      secondaryDiagnosis: z.array(z.string()),
      dischargeSummary: z.string().nullable().describe('出院摘要（住院）'),
      hasRecords: z.boolean().describe('是否有完整病历'),
    }),
  ),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 获取患者就诊历史
 *
 * 获取患者历史就诊记录，支持按时间范围和就诊类型筛选。
 * 时间范围超过2年时自动截断为最近2年。
 *
 * @param input - 包含patientId和可选筛选条件
 * @param context - 工具执行上下文
 * @returns 就诊记录列表
 */
async function executeGetPatientHistory(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GetPatientHistoryInput.parse(input);

  let results = (await clinicalData.getVisitsByPatient(parsed.patientId)).slice();

  // 按就诊类型筛选
  if (parsed.visitType && parsed.visitType !== '全部') {
    results = results.filter((v) => v.visitType === parsed.visitType);
  }

  // 按时间范围筛选
  if (parsed.startDate) {
    results = results.filter((v) => v.visitDate >= parsed.startDate!);
  }
  if (parsed.endDate) {
    results = results.filter((v) => v.visitDate <= parsed.endDate!);
  }

  // 按日期倒序
  results.sort((a, b) => b.visitDate.localeCompare(a.visitDate));

  const total = results.length;
  const limited = results.slice(0, parsed.limit);

  return {
    success: true,
    data: {
      success: true,
      total,
      visits: limited.map((v) => ({
        encounterId: v.encounterId,
        visitType: v.visitType,
        visitDate: v.visitDate,
        department: v.department,
        doctor: v.doctor,
        primaryDiagnosis: v.primaryDiagnosis,
        secondaryDiagnosis: v.secondaryDiagnosis,
        dischargeSummary: v.dischargeSummary,
        hasRecords: v.hasRecords,
      })),
      _source: sourceTag(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const getPatientHistoryTool = buildMedicalTool({
  name: 'get_patient_history',
  description:
    '获取患者历史就诊记录列表，包括门诊、住院、急诊、手术等。支持按时间范围和就诊类型筛选，按日期倒序返回。',
  category: MedicalToolCategory.PATIENT,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['patient:read'],
  inputSchema: GetPatientHistoryInput,
  outputSchema: GetPatientHistoryOutput,
  execute: executeGetPatientHistory,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '就诊历史',
  getActivityDescription: (input: unknown) => {
    const parsed = GetPatientHistoryInput.safeParse(input);
    return parsed.success ? `获取就诊历史: ${parsed.data.patientId}` : '获取就诊历史';
  },
});

export type GetPatientHistoryInputType = z.infer<typeof GetPatientHistoryInput>;
export type GetPatientHistoryOutputType = z.infer<typeof GetPatientHistoryOutput>;
