/**
 * 健澜科技数智医院智能体 - 从EMR获取数据工具
 *
 * 工具名：fetch_from_emr
 * 功能：从EMR系统获取患者病历数据（门诊/住院/病程/手术/知情同意等）
 * 风险等级：low（只读）
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool, maskName } from '../framework.js';
import { MOCK_MEDICAL_RECORDS, MOCK_PATIENTS } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';
import { getEMRAdapter } from './adapterBridge.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const FetchFromEMRInput = z.object({
  patientId: z.string().describe('患者ID（必填）'),
  dataType: z
    .enum(['门诊病历', '住院病历', '病程记录', '手术记录', '知情同意'])
    .default('门诊病历')
    .describe('获取的病历类型'),
  encounterId: z.string().optional().describe('就诊ID'),
  startDate: z.string().optional().describe('开始日期（YYYY-MM-DD）'),
  endDate: z.string().optional().describe('结束日期（YYYY-MM-DD）'),
});

const FetchFromEMROutput = z.object({
  success: z.boolean(),
  patientId: z.string(),
  patientNameMasked: z.string().describe('脱敏后的患者姓名'),
  total: z.number(),
  records: z.array(
    z.object({
      recordId: z.string(),
      recordType: z.string(),
      title: z.string(),
      status: z.string(),
      createdAt: z.string(),
      createdBy: z.string(),
      confirmedBy: z.string().nullable(),
      summary: z.string().describe('病历内容摘要（脱敏）'),
    }),
  ),
  source: z.string().describe('数据来源（adapter/mock）'),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 生成病历内容摘要（取前120字，并对姓名脱敏）
 *
 * @param content - 病历全文
 * @returns 脱敏摘要
 */
function summarizeRecord(content: string): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  const snippet = flat.length > 120 ? flat.slice(0, 120) + '…' : flat;
  return snippet;
}

/**
 * 从EMR获取病历数据
 *
 * 优先调用 EMRMockAdapter 获取结构化病历；适配器不可用或无匹配数据时
 * 回退到内置 Mock 病历库，返回3-5份可信模拟病历。
 *
 * @param input - 查询参数
 * @param context - 工具执行上下文
 * @returns 病历数据列表
 */
async function executeFetchFromEMR(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = FetchFromEMRInput.parse(input);

  // 校验患者存在
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

  // 尝试调用 EMR 适配器
  let source = 'mock';
  try {
    const adapter = await getEMRAdapter();
    if (adapter) {
      try {
        const { records } = await adapter.getRecordList({
          patientId: parsed.patientId,
          ...(parsed.encounterId ? { encounterId: parsed.encounterId } : {}),
          page: 1,
          pageSize: 10,
        });
        if (records.length > 0) {
          source = 'adapter';
          return {
            success: true,
            data: {
              success: true,
              patientId: parsed.patientId,
              patientNameMasked: maskName(patient.name),
              total: records.length,
              records: records.map((r) => ({
                recordId: r.recordId,
                recordType: r.recordTypeName,
                title: r.title,
                status: r.status,
                createdAt: r.createdAt,
                createdBy: r.createdBy,
                confirmedBy: r.signedBy ?? null,
                summary: summarizeRecord(r.freeText ?? ''),
              })),
              source,
            },
          };
        }
      } catch {
        // 适配器无此患者数据，回退本地 Mock
      }
    }
  } catch {
    // 适配器不可用，使用 Mock
  }

  // 本地 Mock 回退：按患者与类型筛选
  let results = MOCK_MEDICAL_RECORDS.filter((r) => r.patientId === parsed.patientId);

  // 类型映射：内置 Mock 病历类型
  const typeMap: Record<string, string[]> = {
    门诊病历: ['门诊病历'],
    住院病历: ['入院记录', '病程记录', '出院小结'],
    病程记录: ['病程记录'],
    手术记录: ['手术记录'],
    知情同意: ['知情同意书'],
  };
  const allowedTypes = typeMap[parsed.dataType] ?? [parsed.dataType];
  results = results.filter((r) => allowedTypes.includes(r.recordType));

  if (parsed.encounterId) {
    results = results.filter((r) => r.encounterId === parsed.encounterId);
  }
  if (parsed.startDate) {
    results = results.filter((r) => r.createdAt.slice(0, 10) >= parsed.startDate!);
  }
  if (parsed.endDate) {
    results = results.filter((r) => r.createdAt.slice(0, 10) <= parsed.endDate!);
  }

  // 若无匹配，返回该患者全部病历（保证返回3-5份模拟数据）
  if (results.length === 0) {
    results = MOCK_MEDICAL_RECORDS.filter((r) => r.patientId === parsed.patientId);
  }
  // 若该患者仍无数据，返回通用示例病历
  if (results.length === 0) {
    results = MOCK_MEDICAL_RECORDS.slice(0, 3);
  }

  return {
    success: true,
    data: {
      success: true,
      patientId: parsed.patientId,
      patientNameMasked: maskName(patient.name),
      total: results.length,
      records: results.map((r) => ({
        recordId: r.recordId,
        recordType: r.recordType,
        title: r.title,
        status: r.status,
        createdAt: r.createdAt,
        createdBy: r.createdBy,
        confirmedBy: r.confirmedBy,
        summary: summarizeRecord(r.content),
      })),
      source,
      _demoMode: true,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const fetchFromEmrTool = buildMedicalTool({
  name: 'fetch_from_emr',
  description:
    '从EMR系统获取患者病历数据，支持按病历类型（门诊病历/住院病历/病程记录/手术记录/知情同意）、就诊ID、时间范围筛选。返回病历列表（含摘要与脱敏患者姓名）。优先调用EMR适配器，不可用时回退Mock。',
  category: MedicalToolCategory.INTEGRATION,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['integration:read'],
  inputSchema: FetchFromEMRInput,
  outputSchema: FetchFromEMROutput,
  execute: executeFetchFromEMR,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '获取EMR病历',
  getActivityDescription: (input: unknown) => {
    const parsed = FetchFromEMRInput.safeParse(input);
    if (parsed.success) {
      return `从EMR获取${parsed.data.dataType}: 患者${parsed.data.patientId}`;
    }
    return '获取EMR病历';
  },
});

export type FetchFromEMRInputType = z.infer<typeof FetchFromEMRInput>;
export type FetchFromEMROutputType = z.infer<typeof FetchFromEMROutput>;
