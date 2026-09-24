/**
 * 健澜科技数智医院智能体 - 获取检验报告工具
 *
 * 工具名：get_lab_result
 * 功能：获取患者检验报告，支持按检验类别、时间、项目筛选，自动识别异常值和危急值
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

const GetLabResultInput = z.object({
  patientId: z.string().describe('患者ID（必填）'),
  encounterId: z.string().optional().describe('就诊ID'),
  testType: z
    .string()
    .optional()
    .describe('检验类型/项目名称（如"血常规""生化""心肌酶""葡萄糖"等）'),
  startDate: z.string().optional().describe('开始日期（YYYY-MM-DD）'),
  endDate: z.string().optional().describe('结束日期（YYYY-MM-DD）'),
  itemName: z.string().optional().describe('具体检验项目名称筛选（如"白细胞计数""肌酐"）'),
});

const GetLabResultOutput = z.object({
  success: z.boolean(),
  reports: z.array(
    z.object({
      reportId: z.string(),
      testName: z.string(),
      testCategory: z.string(),
      specimen: z.string(),
      collectedAt: z.string(),
      reportedAt: z.string(),
      reportingDoctor: z.string(),
      status: z.enum(['检验中', '已报告', '已审核']),
      hasCriticalValue: z.boolean(),
      items: z.array(
        z.object({
          itemName: z.string(),
          result: z.string(),
          unit: z.string().nullable(),
          referenceRange: z.string().nullable(),
          abnormalFlag: z
            .enum(['正常', '偏高', '偏低', '危急高', '危急低', '阳性', '阴性'])
            .nullable(),
        }),
      ),
      reportNotes: z.string().nullable(),
    }),
  ),
  criticalValues: z.array(
    z.object({
      itemName: z.string(),
      result: z.string(),
      referenceRange: z.string(),
      reportedAt: z.string(),
    }),
  ),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 获取检验报告
 *
 * 获取患者检验报告，支持按类型、时间、项目筛选。
 * 自动标记异常值和危急值，并汇总危急值列表。
 *
 * @param input - 查询参数
 * @param context - 工具执行上下文
 * @returns 检验报告列表和危急值汇总
 */
async function executeGetLabResult(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GetLabResultInput.parse(input);

  // 数据源：演示模式走 MOCK_LAB_REPORTS；真实模式走 labResultRepo（已聚合成报告 DTO）。
  // patientId/encounterId 已在数据层过滤，此处仅做类型/时间/项目维度筛选。
  let results = (await clinicalData.getLabReports(parsed.patientId, parsed.encounterId)).slice();

  if (parsed.testType) {
    const kw = parsed.testType.toLowerCase();
    results = results.filter(
      (r) => r.testName.toLowerCase().includes(kw) || r.testCategory.toLowerCase().includes(kw),
    );
  }

  if (parsed.startDate) {
    results = results.filter((r) => r.collectedAt.slice(0, 10) >= parsed.startDate!);
  }
  if (parsed.endDate) {
    results = results.filter((r) => r.collectedAt.slice(0, 10) <= parsed.endDate!);
  }

  // 按项目名称筛选
  if (parsed.itemName) {
    const kw = parsed.itemName.toLowerCase();
    results = results
      .map((r) => ({
        ...r,
        items: r.items.filter((item) => item.itemName.toLowerCase().includes(kw)),
      }))
      .filter((r) => r.items.length > 0);
  }

  // 按报告时间倒序
  results.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));

  // 汇总危急值
  const criticalValues: {
    itemName: string;
    result: string;
    referenceRange: string;
    reportedAt: string;
  }[] = [];
  for (const report of results) {
    if (report.hasCriticalValue) {
      for (const item of report.items) {
        if (item.abnormalFlag === '危急高' || item.abnormalFlag === '危急低') {
          criticalValues.push({
            itemName: item.itemName,
            result: item.result,
            referenceRange: item.referenceRange ?? '',
            reportedAt: report.reportedAt,
          });
        }
      }
    }
  }

  return {
    success: true,
    data: {
      success: true,
      reports: results.map((r) => ({
        reportId: r.reportId,
        testName: r.testName,
        testCategory: r.testCategory,
        specimen: r.specimen,
        collectedAt: r.collectedAt,
        reportedAt: r.reportedAt,
        reportingDoctor: r.reportingDoctor,
        status: r.status,
        hasCriticalValue: r.hasCriticalValue,
        items: r.items,
        reportNotes: r.reportNotes,
      })),
      criticalValues,
      _source: sourceTag(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const getLabResultTool = buildMedicalTool({
  name: 'get_lab_result',
  description:
    '获取患者检验报告，支持按检验类型（血常规/生化/免疫/凝血等）、就诊ID、时间范围、具体项目名称筛选。自动标记异常值（偏高/偏低）和危急值，返回危急值汇总列表。',
  category: MedicalToolCategory.LAB,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['lab:read'],
  inputSchema: GetLabResultInput,
  outputSchema: GetLabResultOutput,
  execute: executeGetLabResult,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '检验报告',
  getActivityDescription: (input: unknown) => {
    const parsed = GetLabResultInput.safeParse(input);
    if (parsed.success) {
      const parts = [`患者${parsed.data.patientId}`];
      if (parsed.data.testType) parts.push(parsed.data.testType);
      return `获取检验报告: ${parts.join(' / ')}`;
    }
    return '获取检验报告';
  },
});

export type GetLabResultInputType = z.infer<typeof GetLabResultInput>;
export type GetLabResultOutputType = z.infer<typeof GetLabResultOutput>;
