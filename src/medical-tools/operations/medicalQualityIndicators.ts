/**
 * 健澜科技数智医院智能体 - 医疗质量指标工具
 *
 * 工具名：medical_quality_indicators
 * 功能：按科室/时间/指标类别查询医疗质量指标，对照基准并标注预警
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';
import { MOCK_QUALITY_INDICATORS } from './operationsData.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const MedicalQualityIndicatorsInput = z.object({
  department: z.string().optional().describe('科室（缺省返回全院指标）'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, '格式应为YYYY-MM或YYYY-MM-DD')
    .describe('开始月份/日期'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, '格式应为YYYY-MM或YYYY-MM-DD')
    .describe('结束月份/日期'),
  indicatorType: z
    .enum(['全部', '效率', '安全', '质量', '合理用药'])
    .default('全部')
    .describe('指标类别'),
});

const MedicalQualityIndicatorsOutput = z.object({
  success: z.boolean(),
  scope: z.string().describe('统计范围'),
  total: z.number(),
  warningCount: z.number().describe('偏离基准预警项数'),
  indicators: z.array(
    z.object({
      department: z.string().nullable(),
      month: z.string(),
      indicatorType: z.string(),
      indicatorName: z.string(),
      value: z.number(),
      unit: z.string(),
      benchmark: z.number(),
      benchmarkDirection: z.string(),
      status: z.enum(['达标', '预警']),
    }),
  ),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 医疗质量指标
 *
 * 按科室、月份区间、指标类别查询医疗质量指标，对照行业基准判断达标/预警。
 * department 缺省时返回全院（department=null）指标；指定科室时同时包含该科室指标。
 *
 * @param input - 查询参数
 * @param _context - 工具执行上下文
 * @returns 质量指标列表
 */
async function executeMedicalQualityIndicators(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = MedicalQualityIndicatorsInput.parse(input);

  const startMonth = parsed.startDate.slice(0, 7);
  const endMonth = parsed.endDate.slice(0, 7);

  let rows = MOCK_QUALITY_INDICATORS.filter((r) => r.month >= startMonth && r.month <= endMonth);

  // 科室过滤：指定科室时返回全院+该科室；未指定时仅全院
  if (parsed.department) {
    rows = rows.filter((r) => r.department === null || r.department === parsed.department);
  } else {
    rows = rows.filter((r) => r.department === null);
  }

  // 类别过滤
  if (parsed.indicatorType && parsed.indicatorType !== '全部') {
    rows = rows.filter((r) => r.indicatorType === parsed.indicatorType);
  }

  const indicators = rows.map((r) => ({
    department: r.department,
    month: r.month,
    indicatorType: r.indicatorType,
    indicatorName: r.indicatorName,
    value: r.value,
    unit: r.unit,
    benchmark: r.benchmark,
    benchmarkDirection: r.benchmarkDirection,
    status: r.warning ? ('预警' as const) : ('达标' as const),
  }));

  const warningCount = indicators.filter((i) => i.status === '预警').length;

  return {
    success: true,
    data: {
      success: true,
      scope: parsed.department ? `${parsed.department}（含全院基线）` : '全院',
      total: indicators.length,
      warningCount,
      indicators,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const medicalQualityIndicatorsTool = buildMedicalTool({
  name: 'medical_quality_indicators',
  description:
    '查询医疗质量指标（效率/安全/质量/合理用药），按科室、月份区间筛选，对照行业基准自动判定达标或预警。覆盖再住院率、跌倒发生率、抗菌药物使用强度、门-球时间达标率、静脉溶栓率等核心指标。',
  category: MedicalToolCategory.QC,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['quality:read'],
  inputSchema: MedicalQualityIndicatorsInput,
  outputSchema: MedicalQualityIndicatorsOutput,
  execute: executeMedicalQualityIndicators,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '医疗质量指标',
  getActivityDescription: (input: unknown) => {
    const parsed = MedicalQualityIndicatorsInput.safeParse(input);
    return parsed.success ? `质量指标: ${parsed.data.department ?? '全院'}` : '医疗质量指标';
  },
});

export type MedicalQualityIndicatorsInputType = z.infer<typeof MedicalQualityIndicatorsInput>;
export type MedicalQualityIndicatorsOutputType = z.infer<typeof MedicalQualityIndicatorsOutput>;
