/**
 * 健澜科技数智医院智能体 - 获取病历模板工具
 *
 * 工具名：get_medical_template
 * 功能：获取指定类型/层级的病历模板，按医生所属科室/身份自动解析四级继承
 *       （L0 国标 → L1 院级 → L2 科室级 → L3 个人级），返回模板正文、结构化字段、
 *       时限 SLA（dueRule）、责任角色与触发事件。
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import {
  NATIONAL_TEMPLATES,
  NATIONAL_TEMPLATE_BY_ID,
  type EmrSeedTemplate,
} from './templates/index.js';
import type { ResolverTemplate } from './templateResolver.js';
import { resolveEffectiveTemplate } from './templateResolver.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const GetMedicalTemplateInput = z.object({
  templateId: z.string().optional().describe('指定模板ID（如 TPL-OP-001）'),
  department: z.string().optional().describe('科室（获取科室定制模板，默认取当前医生科室）'),
  recordType: z.string().optional().describe('文书类型（门诊初诊病历/入院记录/首次病程记录/出院记录等）'),
  keyword: z.string().optional().describe('关键词搜索'),
});

const TemplateFieldSchema = z.object({
  fieldName: z.string(),
  fieldType: z.enum(['text', 'select', 'date', 'number', 'table']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string(),
});

const TemplateSummarySchema = z.object({
  templateId: z.string(),
  name: z.string(),
  recordType: z.string(),
  scope: z.string(),
  department: z.string().nullable(),
  content: z.string().describe('模板内容（含[占位符]）'),
  fields: z.array(TemplateFieldSchema),
  version: z.string(),
  updatedAt: z.string(),
  // 新增：四级继承与流程绑定字段（只增不删，保持旧 schema 兼容）
  dueRule: z.string().nullable().describe('时限 SLA 表达式，如 admission_time + 8h'),
  responsibleRole: z.string().nullable().describe('书写责任角色'),
  triggerEvent: z.string().nullable().describe('触发事件'),
});

const GetMedicalTemplateOutput = z.object({
  success: z.boolean(),
  templates: z.array(TemplateSummarySchema),
});

// ============================================================================
// 种子 → ResolverTemplate 适配（demo/无 DB 模式下 L0 全集）
// ============================================================================

function seedToResolverTemplate(t: EmrSeedTemplate): ResolverTemplate {
  return {
    templateId: t.templateId,
    recordType: t.recordType,
    scope: t.scope,
    status: t.status,
    hospitalId: null,
    departmentId: null,
    userId: null,
    content: t.content,
    fields: t.fields,
    updatedAt: t.updatedAt,
    name: t.name,
    dueRule: t.dueRule,
    responsibleRole: t.responsibleRole,
    triggerEvent: t.triggerEvent,
  };
}

/** L0 种子全集（注入 resolver 的 all 候选；DB 模式下此处替换为 emrTemplateRepo 查询结果）。 */
const NATIONAL_RESOLVER_INPUT: ResolverTemplate[] = NATIONAL_TEMPLATES.map(seedToResolverTemplate);

function seedToSummary(t: EmrSeedTemplate) {
  return {
    templateId: t.templateId,
    name: t.name,
    recordType: t.recordType,
    scope: t.scope,
    department: null,
    content: t.content,
    fields: t.fields,
    version: t.version,
    updatedAt: t.updatedAt.slice(0, 10),
    dueRule: t.dueRule,
    responsibleRole: t.responsibleRole,
    triggerEvent: t.triggerEvent,
  };
}

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 获取病历模板。
 *
 * - 传 templateId：直接返回该模板；
 * - 传 recordType：按当前医生科室/身份自动解析四级继承后的生效模板；
 * - 仅传 department/keyword：在 L0 国标全集上过滤。
 */
async function executeGetMedicalTemplate(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GetMedicalTemplateInput.parse(input);

  // 1) 指定模板ID：直接查种子索引
  if (parsed.templateId) {
    const hit = NATIONAL_TEMPLATE_BY_ID.get(parsed.templateId);
    return {
      success: true,
      data: {
        success: true,
        templates: hit ? [seedToSummary(hit)] : [],
        _demoMode: true,
        resolvedTemplateId: hit?.templateId ?? null,
      },
    };
  }

  // 2) 指定文书类型：走四级继承 resolver（demo 模式下即返回 L0 国标生效模板）
  if (parsed.recordType) {
    const effective = resolveEffectiveTemplate({
      recordType: parsed.recordType,
      hospitalId: null,
      departmentId: context.medicalUser?.department ?? null,
      userId: context.medicalUser?.userId ?? null,
      all: NATIONAL_RESOLVER_INPUT,
    });
    if (!effective) {
      return {
        success: true,
        data: { success: true, templates: [], _demoMode: true, resolvedTemplateId: null },
      };
    }
    const seed = NATIONAL_TEMPLATE_BY_ID.get(effective.templateId);
    return {
      success: true,
      data: {
        success: true,
        templates: [
          {
            templateId: effective.templateId,
            name: effective.name,
            recordType: effective.recordType,
            scope: effective.effectiveScope,
            department: parsed.department ?? null,
            content: effective.content,
            fields: effective.fields,
            version: seed?.version ?? '1.0.0',
            updatedAt: effective.updatedAt.slice(0, 10),
            dueRule: effective.dueRule,
            responsibleRole: effective.responsibleRole,
            triggerEvent: effective.triggerEvent,
          },
        ],
        _demoMode: true,
        resolvedTemplateId: effective.templateId,
        rejectedOverrides: effective.rejectedOverrides,
      },
    };
  }

  // 3) 列表/关键词过滤
  let results = NATIONAL_TEMPLATES;
  if (parsed.department) {
    // L0 国标模板全院通用，科室参数仅作上下文透传
    results = results.filter((t) => t.scope === 'national' || t.name.length > 0);
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
      templates: results.map(seedToSummary),
      _demoMode: true,
      total: results.length,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const getMedicalTemplateTool = buildMedicalTool({
  name: 'get_medical_template',
  description:
    '获取病历模板，按文书类型（门诊初诊病历/入院记录/首次病程记录/出院记录/手术记录等）自动解析四级继承（国标/院级/科室/个人），返回模板正文、结构化字段、时限SLA与责任角色。',
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
      if (parsed.data.templateId) parts.push(parsed.data.templateId);
      return `获取病历模板: ${parts.join(' / ') || '全部'}`;
    }
    return '获取病历模板';
  },
});

export type GetMedicalTemplateInputType = z.infer<typeof GetMedicalTemplateInput>;
export type GetMedicalTemplateOutputType = z.infer<typeof GetMedicalTemplateOutput>;
