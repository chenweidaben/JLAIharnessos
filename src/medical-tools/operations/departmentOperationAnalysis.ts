/**
 * 健澜科技数智医院智能体 - 科室运营分析工具
 *
 * 工具名：department_operation_analysis
 * 功能：按科室与时间区间汇总运营指标，并给出环比与简要解读
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';
import { MOCK_DEPARTMENT_OPERATIONS } from './operationsData.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const DepartmentOperationAnalysisInput = z.object({
  department: z.string().describe('科室名称（如心血管内科）'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, '日期/月份格式应为YYYY-MM或YYYY-MM-DD')
    .describe('开始日期或月份'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, '日期/月份格式应为YYYY-MM或YYYY-MM-DD')
    .describe('结束日期或月份'),
  metrics: z.array(z.string()).optional().describe('关注指标列表（缺省返回全部核心指标）'),
});

const MetricPointSchema = z.object({
  month: z.string(),
  outpatientVisits: z.number(),
  inpatientAdmissions: z.number(),
  dischargeCount: z.number(),
  avgLengthOfStay: z.number(),
  bedOccupancyRate: z.number(),
  revenueWan: z.number(),
  costWan: z.number(),
  grossMarginWan: z.number(),
  drugProportion: z.number(),
  avgCostPerDischarge: z.number(),
});

const DepartmentOperationAnalysisOutput = z.object({
  success: z.boolean(),
  department: z.string(),
  range: z.object({ start: z.string(), end: z.string() }),
  dataPoints: z.array(MetricPointSchema),
  summary: z.object({
    totalOutpatient: z.number(),
    totalAdmissions: z.number(),
    avgBedOccupancy: z.number(),
    totalRevenueWan: z.number(),
    avgDrugProportion: z.number(),
    peakMonth: z.string(),
  }),
  insights: z.array(z.string()).describe('运营解读'),
});

// ============================================================================
// 工具实现
// ============================================================================

/** 计算环比变化率（%），原值为0时返回null */
function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

/**
 * 科室运营分析
 *
 * 汇总指定科室在时间区间内的门诊量、入院、出院、平均住院日、床位使用率、
 * 收支、药占比等核心指标，并生成环比与运营解读。
 *
 * @param input - 科室与时间区间
 * @param _context - 工具执行上下文
 * @returns 运营分析报告
 */
async function executeDepartmentOperationAnalysis(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = DepartmentOperationAnalysisInput.parse(input);

  // 取月份前缀做匹配（支持YYYY-MM-DD输入）
  const startMonth = parsed.startDate.slice(0, 7);
  const endMonth = parsed.endDate.slice(0, 7);

  const rows = MOCK_DEPARTMENT_OPERATIONS.filter(
    (r) => r.department === parsed.department && r.month >= startMonth && r.month <= endMonth,
  ).sort((a, b) => a.month.localeCompare(b.month));

  if (rows.length === 0) {
    return {
      success: false,
      error: {
        code: 'NO_DATA',
        message: `未查询到${parsed.department}在${parsed.startDate}~${parsed.endDate}的运营数据`,
      },
    };
  }

  const dataPoints = rows.map((r) => ({
    month: r.month,
    outpatientVisits: r.outpatientVisits,
    inpatientAdmissions: r.inpatientAdmissions,
    dischargeCount: r.dischargeCount,
    avgLengthOfStay: r.avgLengthOfStay,
    bedOccupancyRate: r.bedOccupancyRate,
    revenueWan: r.revenueWan,
    costWan: r.costWan,
    grossMarginWan: Math.round((r.revenueWan - r.costWan) * 10) / 10,
    drugProportion: r.drugProportion,
    avgCostPerDischarge: r.avgCostPerDischarge,
  }));

  // 汇总
  const latest = rows[rows.length - 1];
  const prev = rows.length >= 2 ? rows[rows.length - 2] : undefined;
  const totalOutpatient = rows.reduce((s, r) => s + r.outpatientVisits, 0);
  const totalAdmissions = rows.reduce((s, r) => s + r.inpatientAdmissions, 0);
  const avgBedOccupancy =
    Math.round((rows.reduce((s, r) => s + r.bedOccupancyRate, 0) / rows.length) * 10) / 10;
  const totalRevenueWan = Math.round(rows.reduce((s, r) => s + r.revenueWan, 0) * 10) / 10;
  const avgDrugProportion =
    Math.round((rows.reduce((s, r) => s + r.drugProportion, 0) / rows.length) * 10) / 10;
  const peakRow = rows.reduce((a, b) => (b.outpatientVisits > a.outpatientVisits ? b : a));

  // 运营解读
  const insights: string[] = [];
  if (prev) {
    const outChange = pctChange(latest.outpatientVisits, prev.outpatientVisits);
    if (outChange !== null) {
      insights.push(
        `最新月门诊量${latest.outpatientVisits}人次，环比${outChange >= 0 ? '增长' : '下降'}${Math.abs(outChange)}%`,
      );
    }
    const bedChange = pctChange(latest.bedOccupancyRate, prev.bedOccupancyRate);
    if (latest.bedOccupancyRate > 95) {
      insights.push(`床位使用率${latest.bedOccupancyRate}%，接近饱和，建议评估扩床或分流`);
    } else if (latest.bedOccupancyRate < 85) {
      insights.push(`床位使用率${latest.bedOccupancyRate}%，尚有收治空间，可加强门诊转化`);
    }
    const drugChange = pctChange(latest.drugProportion, prev.drugProportion);
    insights.push(
      `药占比${latest.drugProportion}%（环比${drugChange! >= 0 ? '上升' : '下降'}${Math.abs(drugChange!)}个百分点）${latest.drugProportion > 30 ? '，高于国家控费参考线，需重点监控' : '，处于合理区间'}`,
    );
  }
  insights.push(
    `平均住院日${latest.avgLengthOfStay}天，次均出院费用约${latest.avgCostPerDischarge.toLocaleString()}元`,
  );
  if (latest.bedOccupancyRate > 100) {
    insights.push(`床位使用率超过100%，存在加床运行，需关注医疗安全与患者体验`);
  }

  return {
    success: true,
    data: {
      success: true,
      department: parsed.department,
      range: { start: startMonth, end: endMonth },
      dataPoints,
      summary: {
        totalOutpatient,
        totalAdmissions,
        avgBedOccupancy,
        totalRevenueWan,
        avgDrugProportion,
        peakMonth: peakRow.month,
      },
      insights,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const departmentOperationAnalysisTool = buildMedicalTool({
  name: 'department_operation_analysis',
  description:
    '按科室与时间区间（月份）汇总运营指标：门诊/急诊量、入院出院、平均住院日、床位使用率、收支、药占比、次均费用，并给出环比与运营解读。',
  category: MedicalToolCategory.QC,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['operation:read'],
  inputSchema: DepartmentOperationAnalysisInput,
  outputSchema: DepartmentOperationAnalysisOutput,
  execute: executeDepartmentOperationAnalysis,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '科室运营分析',
  getActivityDescription: (input: unknown) => {
    const parsed = DepartmentOperationAnalysisInput.safeParse(input);
    return parsed.success ? `运营分析: ${parsed.data.department}` : '科室运营分析';
  },
});

export type DepartmentOperationAnalysisInputType = z.infer<typeof DepartmentOperationAnalysisInput>;
export type DepartmentOperationAnalysisOutputType = z.infer<
  typeof DepartmentOperationAnalysisOutput
>;
