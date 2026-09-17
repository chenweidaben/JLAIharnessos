/**
 * 健澜科技数智医院智能体 - 获取影像报告工具
 *
 * 工具名：get_image_report
 * 功能：获取患者影像检查报告（CT/MRI/X光/超声/内镜等），包含检查所见和诊断结论
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { MOCK_IMAGE_REPORTS } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const GetImageReportInput = z.object({
  patientId: z.string().describe('患者ID（必填）'),
  encounterId: z.string().optional().describe('就诊ID'),
  examType: z
    .enum(['全部', 'CT', 'MRI', 'X光', '超声', '内镜', '病理', '核医学', '其他'])
    .default('全部')
    .describe('检查类型筛选'),
  startDate: z.string().optional().describe('开始日期（YYYY-MM-DD）'),
  endDate: z.string().optional().describe('结束日期（YYYY-MM-DD）'),
});

const GetImageReportOutput = z.object({
  success: z.boolean(),
  reports: z.array(
    z.object({
      reportId: z.string(),
      examType: z.string(),
      examSite: z.string().describe('检查部位'),
      examDate: z.string(),
      reportDate: z.string(),
      modality: z.string(),
      finding: z.string().describe('检查所见'),
      diagnosis: z.string().describe('诊断结论'),
      reportingDoctor: z.string(),
      reviewingDoctor: z.string().nullable().describe('审核医师'),
      status: z.enum(['初步报告', '已审核', '已补充', '已更正']),
      hasImages: z.boolean().describe('是否有DICOM影像可查看'),
      dicomRef: z.string().nullable().describe('DICOM引用'),
      keyFindings: z.array(z.string()).describe('关键发现摘要'),
    }),
  ),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 获取影像报告
 *
 * 获取患者影像检查报告，支持按检查类型和时间范围筛选。
 *
 * @param input - 查询参数
 * @param context - 工具执行上下文
 * @returns 影像报告列表
 */
async function executeGetImageReport(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GetImageReportInput.parse(input);

  let results = MOCK_IMAGE_REPORTS.filter((r) => r.patientId === parsed.patientId);

  if (parsed.encounterId) {
    results = results.filter((r) => r.encounterId === parsed.encounterId);
  }

  if (parsed.examType && parsed.examType !== '全部') {
    results = results.filter((r) => r.examType === parsed.examType);
  }

  if (parsed.startDate) {
    results = results.filter((r) => r.examDate >= parsed.startDate!);
  }
  if (parsed.endDate) {
    results = results.filter((r) => r.examDate <= parsed.endDate!);
  }

  // 按检查日期倒序
  results.sort((a, b) => b.examDate.localeCompare(a.examDate));

  return {
    success: true,
    data: {
      success: true,
      reports: results.map((r) => ({
        reportId: r.reportId,
        examType: r.examType,
        examSite: r.examSite,
        examDate: r.examDate,
        reportDate: r.reportDate,
        modality: r.modality,
        finding: r.finding,
        diagnosis: r.diagnosis,
        reportingDoctor: r.reportingDoctor,
        reviewingDoctor: r.reviewingDoctor,
        status: r.status,
        hasImages: r.hasImages,
        dicomRef: r.dicomRef,
        keyFindings: r.keyFindings,
      })),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const getImageReportTool = buildMedicalTool({
  name: 'get_image_report',
  description:
    '获取患者影像检查报告，支持按检查类型（CT/MRI/X光/超声/内镜/病理/核医学）、就诊ID、时间范围筛选。返回检查所见、诊断结论、关键发现摘要和DICOM引用。',
  category: MedicalToolCategory.IMAGING,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['imaging:read'],
  inputSchema: GetImageReportInput,
  outputSchema: GetImageReportOutput,
  execute: executeGetImageReport,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '影像报告',
  getActivityDescription: (input: unknown) => {
    const parsed = GetImageReportInput.safeParse(input);
    if (parsed.success) {
      const parts = [`患者${parsed.data.patientId}`];
      if (parsed.data.examType !== '全部') parts.push(parsed.data.examType);
      return `获取影像报告: ${parts.join(' / ')}`;
    }
    return '获取影像报告';
  },
});

export type GetImageReportInputType = z.infer<typeof GetImageReportInput>;
export type GetImageReportOutputType = z.infer<typeof GetImageReportOutput>;
