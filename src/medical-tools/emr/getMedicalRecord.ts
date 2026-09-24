/**
 * 健澜科技数智医院智能体 - 获取病历内容工具
 *
 * 工具名：get_medical_record
 * 功能：根据病历ID或就诊ID获取病历文书全文，支持指定文书类型和时间范围
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

const GetMedicalRecordInput = z.object({
  patientId: z.string().describe('患者ID'),
  encounterId: z.string().optional().describe('就诊ID（获取该次就诊全部病历）'),
  recordType: z.string().optional().describe('文书类型（门诊病历/入院记录/病程记录/出院小结等）'),
  startDate: z.string().optional().describe('开始日期（YYYY-MM-DD）'),
  endDate: z.string().optional().describe('结束日期（YYYY-MM-DD）'),
});

const GetMedicalRecordOutput = z.object({
  success: z.boolean(),
  records: z.array(
    z.object({
      recordId: z.string(),
      encounterId: z.string(),
      patientId: z.string(),
      recordType: z.string(),
      title: z.string(),
      content: z.string().describe('病历正文（结构化文本）'),
      status: z.enum(['草稿', '待复核', '已确认', '已归档']),
      createdAt: z.string(),
      createdBy: z.string(),
      confirmedAt: z.string().nullable(),
      confirmedBy: z.string().nullable(),
      qcScore: z.number().nullable().describe('质控得分'),
    }),
  ),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 获取病历内容
 *
 * 根据患者ID、就诊ID、文书类型、时间范围获取病历文书。
 *
 * @param input - 查询参数
 * @param context - 工具执行上下文
 * @returns 病历列表
 */
async function executeGetMedicalRecord(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GetMedicalRecordInput.parse(input);

  // 数据源：演示模式走 MOCK_MEDICAL_RECORDS+内存新建；真实模式走 medicalRecordRepo。
  // patientId/encounterId 已在数据层过滤，此处仅做文书类型/时间维度筛选。
  let results = (await clinicalData.getMedicalRecords(parsed.patientId, parsed.encounterId)).slice();

  if (parsed.recordType) {
    results = results.filter((r) => r.recordType.includes(parsed.recordType!));
  }

  if (parsed.startDate) {
    results = results.filter((r) => r.createdAt.slice(0, 10) >= parsed.startDate!);
  }
  if (parsed.endDate) {
    results = results.filter((r) => r.createdAt.slice(0, 10) <= parsed.endDate!);
  }

  // 按创建时间倒序
  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    success: true,
    data: {
      success: true,
      records: results.map((r) => ({
        recordId: r.recordId,
        encounterId: r.encounterId,
        patientId: r.patientId,
        recordType: r.recordType,
        title: r.title,
        content: r.content,
        status: r.status,
        createdAt: r.createdAt,
        createdBy: r.createdBy,
        confirmedAt: r.confirmedAt,
        confirmedBy: r.confirmedBy,
        qcScore: r.qcScore,
      })),
      _source: sourceTag(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const getMedicalRecordTool = buildMedicalTool({
  name: 'get_medical_record',
  description:
    '根据患者ID获取病历文书，支持按就诊ID、文书类型（门诊病历/入院记录/病程记录/出院小结等）、时间范围筛选。返回病历全文、状态和质控得分。',
  category: MedicalToolCategory.EMR,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['emr:read'],
  inputSchema: GetMedicalRecordInput,
  outputSchema: GetMedicalRecordOutput,
  execute: executeGetMedicalRecord,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '获取病历',
  getActivityDescription: (input: unknown) => {
    const parsed = GetMedicalRecordInput.safeParse(input);
    return parsed.success ? `获取病历: 患者${parsed.data.patientId}` : '获取病历';
  },
});

export type GetMedicalRecordInputType = z.infer<typeof GetMedicalRecordInput>;
export type GetMedicalRecordOutputType = z.infer<typeof GetMedicalRecordOutput>;
