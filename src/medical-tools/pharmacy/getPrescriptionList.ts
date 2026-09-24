/**
 * 健澜科技数智医院智能体 - 查询处方列表工具
 *
 * 工具名：get_prescription_list
 * 功能：按患者/就诊/状态/时间范围查询处方列表
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

const GetPrescriptionListInput = z.object({
  patientId: z.string().describe('患者ID（必填）'),
  encounterId: z.string().optional().describe('就诊ID'),
  status: z
    .enum(['全部', '待审核', '已审核', '已发药', '已驳回', '已退回'])
    .default('全部')
    .describe('处方状态筛选'),
  startDate: z.string().optional().describe('开始日期（YYYY-MM-DD）'),
  endDate: z.string().optional().describe('结束日期（YYYY-MM-DD）'),
});

const PrescriptionItemView = z.object({
  drugName: z.string(),
  specification: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  days: z.number(),
  quantity: z.number(),
  usage: z.string(),
});

const GetPrescriptionListOutput = z.object({
  success: z.boolean(),
  total: z.number(),
  prescriptions: z.array(
    z.object({
      prescriptionId: z.string(),
      prescriptionType: z.string(),
      status: z.string(),
      diagnosis: z.string().nullable(),
      itemCount: z.number(),
      items: z.array(PrescriptionItemView),
      totalFee: z.number(),
      doctorName: z.string(),
      pharmacist: z.string().nullable(),
      createdAt: z.string(),
      auditedAt: z.string().nullable(),
    }),
  ),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 查询处方列表
 *
 * 按患者ID、就诊ID、处方状态、开方时间范围多维度筛选，按开方时间倒序。
 *
 * @param input - 查询参数
 * @param _context - 工具执行上下文
 * @returns 处方列表
 */
async function executeGetPrescriptionList(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GetPrescriptionListInput.parse(input);

  // 数据源：演示模式读 PRESCRIPTION_STORE，真实模式走 prescriptionRepo。
  // patientId/encounterId 已在数据层过滤，此处仅做状态/时间维度筛选。
  let results = (await clinicalData.getPrescriptions(parsed.patientId, parsed.encounterId)).slice();

  if (parsed.status && parsed.status !== '全部') {
    results = results.filter((r) => r.status === parsed.status);
  }

  if (parsed.startDate) {
    results = results.filter((r) => r.createdAt.slice(0, 10) >= parsed.startDate!);
  }
  if (parsed.endDate) {
    results = results.filter((r) => r.createdAt.slice(0, 10) <= parsed.endDate!);
  }

  // 按开方时间倒序
  results = [...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    success: true,
    data: {
      success: true,
      total: results.length,
      prescriptions: results.map((r) => ({
        prescriptionId: r.prescriptionId,
        prescriptionType: r.prescriptionType,
        status: r.status,
        diagnosis: r.diagnosis,
        itemCount: r.items.length,
        items: r.items,
        totalFee: r.totalFee,
        doctorName: r.doctorName,
        pharmacist: r.pharmacist,
        createdAt: r.createdAt,
        auditedAt: r.auditedAt,
      })),
      _source: sourceTag(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const getPrescriptionListTool = buildMedicalTool({
  name: 'get_prescription_list',
  description:
    '查询患者处方列表，支持按就诊ID、处方状态（待审核/已审核/已发药/已驳回/已退回）、开方时间范围筛选，返回药品明细、费用及审核信息。',
  category: MedicalToolCategory.PRESCRIPTION,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['prescription:read'],
  inputSchema: GetPrescriptionListInput,
  outputSchema: GetPrescriptionListOutput,
  execute: executeGetPrescriptionList,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '处方列表',
  getActivityDescription: (input: unknown) => {
    const parsed = GetPrescriptionListInput.safeParse(input);
    return parsed.success ? `查询处方: 患者${parsed.data.patientId}` : '查询处方';
  },
});

export type GetPrescriptionListInputType = z.infer<typeof GetPrescriptionListInput>;
export type GetPrescriptionListOutputType = z.infer<typeof GetPrescriptionListOutput>;
