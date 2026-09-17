/**
 * 健澜科技数智医院智能体 - 获取病历模板工具
 *
 * 工具名：get_medical_template
 * 功能：获取指定类型的病历模板，支持医院/科室/个人三级模板
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { MOCK_MEDICAL_TEMPLATES } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const GetMedicalTemplateInput = z.object({
  templateId: z.string().optional().describe('指定模板ID'),
  department: z.string().optional().describe('科室（获取科室定制模板）'),
  recordType: z.string().optional().describe('文书类型（门诊病历/入院记录/病程记录/出院小结等）'),
  keyword: z.string().optional().describe('关键词搜索'),
});

const GetMedicalTemplateOutput = z.object({
  success: z.boolean(),
  templates: z.array(
    z.object({
      templateId: z.string(),
      name: z.string(),
      recordType: z.string(),
      scope: z.string(),
      department: z.string().nullable(),
      content: z.string().describe('模板内容（含占位符）'),
      fields: z.array(
        z.object({
          fieldName: z.string(),
          fieldType: z.enum(['text', 'select', 'date', 'number', 'table']),
          required: z.boolean(),
          options: z.array(z.string()).optional(),
          placeholder: z.string(),
        }),
      ),
      version: z.string(),
      updatedAt: z.string(),
    }),
  ),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 获取病历模板
 *
 * 支持按模板ID、科室、文书类型、关键词查询病历模板。
 *
 * @param input - 查询参数
 * @param context - 工具执行上下文
 * @returns 模板列表
 */
async function executeGetMedicalTemplate(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GetMedicalTemplateInput.parse(input);

  let results = [...MOCK_MEDICAL_TEMPLATES];

  if (parsed.templateId) {
    results = results.filter((t) => t.templateId === parsed.templateId);
  }

  if (parsed.recordType) {
    results = results.filter((t) => t.recordType.includes(parsed.recordType!));
  }

  if (parsed.department) {
    results = results.filter((t) => t.department === null || t.department === parsed.department);
  }

  if (parsed.keyword) {
    const kw = parsed.keyword.toLowerCase();
    results = results.filter(
      (t) =>
        t.name.toLowerCase().includes(kw) ||
        t.recordType.toLowerCase().includes(kw) ||
        t.content.toLowerCase().includes(kw),
    );
  }

  return {
    success: true,
    data: {
      success: true,
      templates: results.map((t) => ({
        templateId: t.templateId,
        name: t.name,
        recordType: t.recordType,
        scope: t.scope,
        department: t.department,
        content: t.content,
        fields: t.fields,
        version: t.version,
        updatedAt: t.updatedAt,
      })),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const getMedicalTemplateTool = buildMedicalTool({
  name: 'get_medical_template',
  description:
    '获取病历模板，支持按模板ID、科室、文书类型（门诊病历/入院记录/病程记录/出院小结等）、关键词查询。返回模板内容、结构化字段定义和版本信息。',
  category: MedicalToolCategory.EMR,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['emr:read'],
  inputSchema: GetMedicalTemplateInput,
  outputSchema: GetMedicalTemplateOutput,
  execute: executeGetMedicalTemplate,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '病历模板',
  getActivityDescription: (input: unknown) => {
    const parsed = GetMedicalTemplateInput.safeParse(input);
    if (parsed.success) {
      const parts: string[] = [];
      if (parsed.data.recordType) parts.push(parsed.data.recordType);
      if (parsed.data.department) parts.push(parsed.data.department);
      return `获取病历模板: ${parts.join(' / ') || '全部'}`;
    }
    return '获取病历模板';
  },
});

export type GetMedicalTemplateInputType = z.infer<typeof GetMedicalTemplateInput>;
export type GetMedicalTemplateOutputType = z.infer<typeof GetMedicalTemplateOutput>;
