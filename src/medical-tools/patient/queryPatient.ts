/**
 * 健澜科技数智医院智能体 - 查询患者工具
 *
 * 工具名：query_patient
 * 功能：根据患者ID、姓名、身份证号等条件查询患者基本信息列表，支持模糊搜索和分页
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool, maskName } from '../framework.js';
import { MOCK_PATIENTS } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const QueryPatientInput = z
  .object({
    name: z.string().optional().describe('患者姓名（支持模糊匹配）'),
    patientId: z.string().optional().describe('患者唯一ID'),
    idCard: z.string().optional().describe('身份证号'),
    gender: z.enum(['男', '女', '未知']).optional().describe('性别'),
    ageRange: z
      .object({
        min: z.number().int().min(0).max(150).describe('最小年龄'),
        max: z.number().int().min(0).max(150).describe('最大年龄'),
      })
      .optional()
      .describe('年龄范围'),
    page: z.number().int().min(1).default(1).describe('页码'),
    pageSize: z.number().int().min(1).max(50).default(10).describe('每页条数'),
  })
  .refine(
    (data) => {
      // 这里必须用 ||：空串应视为"未提供该条件"，不可换成 ??（空串会被 ?? 误判为已提供）
      const hasCondition =
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        data.name || data.patientId || data.idCard || data.gender || data.ageRange;
      return Boolean(hasCondition);
    },
    { message: '至少提供一个查询条件' },
  );

const QueryPatientOutput = z.object({
  success: z.boolean(),
  total: z.number().describe('总匹配数'),
  page: z.number(),
  pageSize: z.number(),
  data: z.array(
    z.object({
      patientId: z.string(),
      name: z.string().describe('脱敏姓名，如"李*英"'),
      gender: z.enum(['男', '女', '未知']),
      age: z.number().nullable(),
      medicalRecordNo: z.string().nullable(),
      department: z.string().nullable(),
      currentDiagnosis: z.string().nullable(),
      lastVisitDate: z.string().nullable().describe('最后就诊日期'),
      isEmergency: z.boolean().default(false),
    }),
  ),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 查询患者基本信息
 *
 * 支持多条件组合查询，分页返回脱敏后的患者数据。
 * 所有查询操作均记录审计日志。
 *
 * @param input - 查询参数，至少提供一个查询条件
 * @param context - 工具执行上下文
 * @returns 查询结果，包含患者列表和分页信息
 */
async function executeQueryPatient(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = QueryPatientInput.parse(input);

  // 多条件过滤
  const results = MOCK_PATIENTS.filter((p) => {
    if (parsed.patientId && p.patientId !== parsed.patientId) return false;
    if (parsed.name && !p.name.includes(parsed.name)) return false;
    if (parsed.idCard && p.idCard !== parsed.idCard) return false;
    if (parsed.gender && p.gender !== parsed.gender) return false;
    if (parsed.ageRange) {
      if (p.age < parsed.ageRange.min || p.age > parsed.ageRange.max) return false;
    }
    return true;
  });

  const total = results.length;

  // 分页
  const start = (parsed.page - 1) * parsed.pageSize;
  const pageData = results.slice(start, start + parsed.pageSize);

  // 脱敏输出
  const desensitized = pageData.map((p) => ({
    patientId: p.patientId,
    name: maskName(p.name),
    gender: p.gender,
    age: p.age,
    medicalRecordNo: p.medicalRecordNo,
    department: p.department,
    currentDiagnosis: p.currentDiagnosis,
    lastVisitDate: p.lastVisitDate,
    isEmergency: p.isEmergency,
  }));

  return {
    success: true,
    data: {
      success: true,
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      data: desensitized,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const queryPatientTool = buildMedicalTool({
  name: 'query_patient',
  description:
    '根据患者ID、姓名、身份证号、性别、年龄范围等条件查询患者基本信息列表，支持模糊搜索和分页。返回脱敏后的患者数据。',
  category: MedicalToolCategory.PATIENT,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['patient:read'],
  inputSchema: QueryPatientInput,
  outputSchema: QueryPatientOutput,
  execute: executeQueryPatient,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '查询患者',
  getActivityDescription: (input: unknown) => {
    const parsed = QueryPatientInput.safeParse(input);
    if (parsed.success) {
      const conditions: string[] = [];
      if (parsed.data.name) conditions.push(`姓名:${parsed.data.name}`);
      if (parsed.data.patientId) conditions.push(`ID:${parsed.data.patientId}`);
      if (parsed.data.gender) conditions.push(`性别:${parsed.data.gender}`);
      return `查询患者: ${conditions.join(', ') || '全部'}`;
    }
    return '查询患者';
  },
});

export type QueryPatientInputType = z.infer<typeof QueryPatientInput>;
export type QueryPatientOutputType = z.infer<typeof QueryPatientOutput>;
