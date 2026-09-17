/**
 * 健澜科技数智医院智能体 - DRG/DIP分析工具
 *
 * 工具名：drg_dip_analysis
 * 功能：按病例/科室/DRG组/时间筛选DRG/DIP分组病例，分析费用盈亏与超标情况
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';
import { DRG_BASE_RATE, MOCK_DRG_CASES } from './operationsData.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const DrgDipAnalysisInput = z.object({
  patientId: z.string().optional().describe('患者ID'),
  encounterId: z.string().optional().describe('就诊/住院ID'),
  department: z.string().optional().describe('科室'),
  drgGroup: z.string().optional().describe('DRG分组码（如FM1/ES1/BR1）'),
  timeRange: z.string().optional().describe('时间范围（月份，如2026-09）'),
});

const DrgCaseViewSchema = z.object({
  caseId: z.string(),
  patientId: z.string(),
  encounterId: z.string(),
  department: z.string(),
  drgGroup: z.string(),
  drgGroupName: z.string(),
  weight: z.number(),
  totalCost: z.number(),
  paidAmount: z.number(),
  surplus: z.number().describe('结余（付费-实际费用，正数为结余，负数为亏损）'),
  riskLevel: z.string(),
  outlierFlag: z.string(),
  losDays: z.number(),
  dischargeStatus: z.string(),
});

const DrgDipAnalysisOutput = z.object({
  success: z.boolean(),
  totalCases: z.number(),
  baseRate: z.number().describe('每权重支付基准（元）'),
  aggregate: z.object({
    totalCost: z.number(),
    totalPaid: z.number(),
    totalSurplus: z.number(),
    avgWeight: z.number(),
    highOutlierCount: z.number().describe('高标费用例数'),
    lowOutlierCount: z.number().describe('低标费用例数'),
    profitableCases: z.number(),
    lossCases: z.number(),
  }),
  cases: z.array(DrgCaseViewSchema),
  insights: z.array(z.string()).describe('DRG/DIP运营解读'),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * DRG/DIP分析
 *
 * 按患者、就诊、科室、DRG组、时间筛选分组病例，计算单例与汇总的费用盈亏
 * （付费金额 - 实际费用），识别高标/低标费用 outliers 并给出运营解读。
 *
 * @param input - 筛选条件
 * @param _context - 工具执行上下文
 * @returns DRG/DIP分析结果
 */
async function executeDrgDipAnalysis(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = DrgDipAnalysisInput.parse(input);

  let rows = [...MOCK_DRG_CASES];
  if (parsed.patientId) {
    rows = rows.filter((c) => c.patientId === parsed.patientId);
  }
  if (parsed.encounterId) {
    rows = rows.filter((c) => c.encounterId === parsed.encounterId);
  }
  if (parsed.department) {
    rows = rows.filter((c) => c.department === parsed.department);
  }
  if (parsed.drgGroup) {
    rows = rows.filter((c) => c.drgGroup.toUpperCase() === parsed.drgGroup!.toUpperCase());
  }
  if (parsed.timeRange) {
    rows = rows.filter((c) => c.month === parsed.timeRange);
  }

  if (rows.length === 0) {
    return {
      success: false,
      error: {
        code: 'NO_DATA',
        message: '未查询到符合条件的DRG/DIP分组病例',
      },
    };
  }

  type DrgCaseView = z.infer<typeof DrgCaseViewSchema>;
  const cases: DrgCaseView[] = rows.map((c) => {
    const surplus = Math.round(c.paidAmount - c.totalCost);
    return {
      caseId: c.caseId,
      patientId: c.patientId,
      encounterId: c.encounterId,
      department: c.department,
      drgGroup: c.drgGroup,
      drgGroupName: c.drgGroupName,
      weight: c.weight,
      totalCost: c.totalCost,
      paidAmount: c.paidAmount,
      surplus,
      riskLevel: c.riskLevel,
      outlierFlag: c.outlierFlag,
      losDays: c.losDays,
      dischargeStatus: c.dischargeStatus,
    };
  });

  const totalCost = cases.reduce((s, c) => s + c.totalCost, 0);
  const totalPaid = cases.reduce((s, c) => s + c.paidAmount, 0);
  const totalSurplus = totalPaid - totalCost;
  const avgWeight =
    Math.round((cases.reduce((s, c) => s + c.weight, 0) / cases.length) * 100) / 100;
  const highOutlierCount = cases.filter((c) => c.outlierFlag === '高标费用').length;
  const lowOutlierCount = cases.filter((c) => c.outlierFlag === '低标费用').length;
  const profitableCases = cases.filter((c) => c.surplus >= 0).length;
  const lossCases = cases.filter((c) => c.surplus < 0).length;

  // 解读
  const insights: string[] = [];
  insights.push(
    totalSurplus >= 0
      ? `本批病例合计DRG付费结余约${(totalSurplus / 10000).toFixed(2)}万元，整体运行盈余`
      : `本批病例合计DRG付费亏损约${(Math.abs(totalSurplus) / 10000).toFixed(2)}万元，需分析成本结构`,
  );
  if (highOutlierCount > 0) {
    insights.push(
      `存在${highOutlierCount}例高标费用病例，建议复盘耗材/药品/超长住院等成本驱动因素`,
    );
  }
  if (lowOutlierCount > 0) {
    insights.push(`存在${lowOutlierCount}例低标费用病例，需警惕分解住院或诊疗不足风险`);
  }
  insights.push(`平均DRG权重${avgWeight}，付费基准每权重${DRG_BASE_RATE.toLocaleString()}元`);
  if (lossCases > profitableCases) {
    insights.push(
      `亏损病例(${lossCases})多于结余病例(${profitableCases})，建议加强临床路径与病种成本管控`,
    );
  }

  return {
    success: true,
    data: {
      success: true,
      totalCases: cases.length,
      baseRate: DRG_BASE_RATE,
      aggregate: {
        totalCost,
        totalPaid,
        totalSurplus,
        avgWeight,
        highOutlierCount,
        lowOutlierCount,
        profitableCases,
        lossCases,
      },
      cases,
      insights,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const drgDipAnalysisTool = buildMedicalTool({
  name: 'drg_dip_analysis',
  description:
    'DRG/DIP病种付费分析：按患者/就诊/科室/DRG组/时间筛选分组病例，计算单例与汇总费用盈亏（付费-实际成本）、平均权重、高标/低标费用例数，并给出成本管控解读。',
  category: MedicalToolCategory.QC,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['drg:read'],
  inputSchema: DrgDipAnalysisInput,
  outputSchema: DrgDipAnalysisOutput,
  execute: executeDrgDipAnalysis,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => 'DRG/DIP分析',
  getActivityDescription: (input: unknown) => {
    const parsed = DrgDipAnalysisInput.safeParse(input);
    if (parsed.success) {
      const scope =
        parsed.data.department ?? parsed.data.drgGroup ?? parsed.data.patientId ?? '全院';
      return `DRG/DIP分析: ${scope}`;
    }
    return 'DRG/DIP分析';
  },
});

export type DrgDipAnalysisInputType = z.infer<typeof DrgDipAnalysisInput>;
export type DrgDipAnalysisOutputType = z.infer<typeof DrgDipAnalysisOutput>;
