/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 病案首页质控工具
 * ---------------------------------------------------------------------------
 * 工具名：medical_record_front_page_check
 * 校验病案首页：主要诊断选择正确性、手术操作编码完整性、离院方式、费用合理性，
 * 并给出DRG分组建议。当前为 Mock 实现。结果仅供参考，编码以病案编码员确认为准。
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// Schema
// ============================================================================

const FrontPageData = z.object({
  patientId: z.string().describe('患者ID'),
  mainDiagnosis: z.string().describe('主要诊断名称'),
  secondaryDiagnoses: z.array(z.string()).default([]).describe('其他诊断'),
  mainIcd10: z.string().optional().describe('主要诊断ICD-10编码'),
  surgeries: z
    .array(
      z.object({
        name: z.string(),
        icd9cm3: z.string().optional(),
        date: z.string().optional(),
      }),
    )
    .default([])
    .describe('手术操作列表'),
  dischargeDisposition: z
    .enum(['正常出院', '转院', '转科', '自动出院', '死亡', '其他'])
    .describe('离院方式'),
  totalCost: z.number().describe('总费用（元）'),
  insuranceType: z.string().optional().describe('医保类型'),
});

const MedicalRecordFrontPageCheckOutput = z.object({
  success: z.boolean(),
  mainDiagnosisAssessment: z.object({
    diagnosis: z.string(),
    isCorrect: z.boolean(),
    suggestion: z.string(),
  }),
  surgeryCodingAssessment: z.object({
    totalSurgeries: z.number(),
    codedSurgeries: z.number(),
    incomplete: z.boolean(),
    suggestion: z.string(),
  }),
  drgGroupSuggestion: z.object({
    groupCode: z.string().nullable(),
    groupName: z.string().nullable(),
    confidence: z.number(),
    note: z.string(),
  }),
  costAssessment: z.object({
    totalCost: z.number(),
    isReasonable: z.boolean(),
    suggestion: z.string(),
  }),
  defects: z.array(
    z.object({
      field: z.string(),
      severity: z.enum(['严重', '一般']),
      description: z.string(),
      suggestion: z.string(),
    }),
  ),
  disclaimer: z.string().default('首页质控结果仅供参考，最终以病案编码员确认为准'),
  checkedAt: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 病案首页质控：Mock 评估主要诊断、手术编码、DRG建议与费用。
 */
async function executeFrontPageCheck(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const wrapped = z.object({ frontPageData: FrontPageData }).parse(input);
  const parsed = wrapped.frontPageData;

  const defects: {
    field: string;
    severity: '严重' | '一般';
    description: string;
    suggestion: string;
  }[] = [];

  // 主要诊断选择：缺少ICD编码或主要诊断为空
  const isMainDiagnosisOk = parsed.mainDiagnosis.trim().length > 0 && !!parsed.mainIcd10;
  if (!parsed.mainIcd10) {
    defects.push({
      field: 'mainIcd10',
      severity: '严重',
      description: '主要诊断缺少ICD-10编码，将影响DRG分组',
      suggestion: '补录主要诊断ICD-10编码',
    });
  }

  // 手术编码完整性
  const codedSurgeries = parsed.surgeries.filter((s) => !!s.icd9cm3).length;
  const incomplete = parsed.surgeries.length > 0 && codedSurgeries < parsed.surgeries.length;
  if (incomplete) {
    defects.push({
      field: 'surgeries',
      severity: '一般',
      description: `${parsed.surgeries.length - codedSurgeries}项手术操作缺少ICD-9-CM-3编码`,
      suggestion: '为所有手术操作补全编码',
    });
  }

  // 离院方式与费用一致性：死亡但费用异常
  if (parsed.dischargeDisposition === '死亡' && parsed.totalCost > 200000) {
    defects.push({
      field: 'totalCost',
      severity: '一般',
      description: '死亡病例费用偏高，建议核对费用明细',
      suggestion: '复核重症及抢救费用是否合理',
    });
  }
  // 离院方式完整性
  if (!parsed.dischargeDisposition) {
    defects.push({
      field: 'dischargeDisposition',
      severity: '严重',
      description: '离院方式未填写',
      suggestion: '补录离院方式',
    });
  }

  const costReasonable = parsed.totalCost < 150000;

  return {
    success: true,
    data: {
      success: true,
      mainDiagnosisAssessment: {
        diagnosis: parsed.mainDiagnosis,
        isCorrect: isMainDiagnosisOk,
        suggestion: isMainDiagnosisOk
          ? '主要诊断选择与编码合理'
          : '请核对主要诊断是否为本次住院消耗资源最多的疾病',
      },
      surgeryCodingAssessment: {
        totalSurgeries: parsed.surgeries.length,
        codedSurgeries,
        incomplete,
        suggestion: incomplete ? '补全缺失手术编码' : '手术操作编码完整',
      },
      drgGroupSuggestion: {
        groupCode: parsed.mainIcd10 ? '待分组' : null,
        groupName: parsed.mainIcd10 ? `${parsed.mainDiagnosis}相关DRG组（预分组）` : null,
        confidence: parsed.mainIcd10 ? 0.72 : 0,
        note: 'DRG预分组需完整主要诊断+手术编码后由分组器计算',
      },
      costAssessment: {
        totalCost: parsed.totalCost,
        isReasonable: costReasonable,
        suggestion: costReasonable ? '费用处于合理区间' : '费用偏高，请结合病种核验合理性',
      },
      defects,
      disclaimer: '首页质控结果仅供参考，最终以病案编码员确认为准',
      checkedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// 导出
// ============================================================================

export const medicalRecordFrontPageCheckTool = buildMedicalTool({
  name: 'medical_record_front_page_check',
  description:
    '对病案首页进行质控：主要诊断选择正确性、手术操作编码完整性、离院方式与费用合理性，并给出DRG预分组建议。输入frontPageData。结果仅供参考。',
  category: MedicalToolCategory.QC,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: z.object({ frontPageData: FrontPageData }),
  outputSchema: MedicalRecordFrontPageCheckOutput,
  execute: executeFrontPageCheck,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '病案首页质控',
  getActivityDescription: () => '病案首页质量控制',
});

export type MedicalRecordFrontPageCheckInputType = z.infer<
  typeof medicalRecordFrontPageCheckTool.inputSchema
>;
export type MedicalRecordFrontPageCheckOutputType = z.infer<
  typeof MedicalRecordFrontPageCheckOutput
>;
