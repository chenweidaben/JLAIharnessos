/**
 * 健澜科技数智医院智能体 - 渲染病历模板草稿工具
 *
 * 工具名：render_medical_template
 * 功能：按 templateId 取模板，把正文里的 [占位符] 按 data 键值对填充，
 *       输出可直接落 clinical.medical_records 的草稿正文。
 *       这是把"模板"与"病历生成"真正打通的关键工具（替代旧 generateMedicalRecord
 *       接受 templateId 但从不消费的脱钩状态）。
 * 风险等级：low（只读模板 + 本地字符串渲染，不写库）
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { NATIONAL_TEMPLATE_BY_ID } from './templates/index.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const RenderMedicalTemplateInput = z.object({
  templateId: z.string().describe('模板ID，如 TPL-AD-001'),
  /**
   * 占位符键值对：key 为模板正文中 [ ] 内的中文占位名（不带方括号），
   * value 为填充值。未提供的占位符保留原 [占位符] 待医生补填。
   * 例：{ "主诉": "反复胸痛3天", "姓名": "张**" }
   */
  data: z.record(z.string(), z.string()).default({}),
});

const RenderMedicalTemplateOutput = z.object({
  success: z.boolean(),
  templateId: z.string(),
  renderedContent: z.string().describe('渲染后草稿正文'),
  filledPlaceholders: z.array(z.string()).describe('已填充的占位符名'),
  missingPlaceholders: z.array(z.string()).describe('未填充、仍保留 [ ] 的占位符名'),
});

// ============================================================================
// 渲染纯函数（可单测，不依赖工具上下文）
// ============================================================================

const PLACEHOLDER_RE = /\[([^\]]+)\]/g;

export interface RenderResult {
  renderedContent: string;
  filled: string[];
  missing: string[];
}

/**
 * 把 content 里的每个 [占位符] 用 data[占位符] 替换。
 * - 命中 data 的占位符 → 替换为实际值，记入 filled；
 * - 未命中 → 保留原 [占位符]，记入 missing（医生待补）。
 */
export function renderTemplateContent(content: string, data: Record<string, string>): RenderResult {
  const filledSet = new Set<string>();
  const missingSet = new Set<string>();
  const rendered = content.replace(PLACEHOLDER_RE, (_, name: string) => {
    const key = String(name).trim();
    if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== '') {
      filledSet.add(key);
      return data[key];
    }
    missingSet.add(key);
    return `[${key}]`;
  });
  return {
    renderedContent: rendered,
    filled: [...filledSet],
    missing: [...missingSet],
  };
}

// ============================================================================
// 工具实现
// ============================================================================

async function executeRenderMedicalTemplate(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = RenderMedicalTemplateInput.parse(input);
  const tpl = NATIONAL_TEMPLATE_BY_ID.get(parsed.templateId);
  if (!tpl) {
    return {
      success: false,
      error: {
        code: 'TEMPLATE_NOT_FOUND',
        message: `模板 ${parsed.templateId} 不存在`,
      },
    };
  }
  const { renderedContent, filled, missing } = renderTemplateContent(tpl.content, parsed.data);
  return {
    success: true,
    data: {
      success: true,
      templateId: tpl.templateId,
      renderedContent,
      filledPlaceholders: filled,
      missingPlaceholders: missing,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const renderMedicalTemplateTool = buildMedicalTool({
  name: 'render_medical_template',
  description:
    '按 templateId 取病历模板，把正文中的 [占位符] 按 data 键值对填充，输出可直接作为病历草稿的正文。与 get_medical_template 配套使用：先取模板，再渲染。',
  category: MedicalToolCategory.EMR,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['emr:read'],
  inputSchema: RenderMedicalTemplateInput,
  outputSchema: RenderMedicalTemplateOutput,
  execute: executeRenderMedicalTemplate,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '渲染病历模板',
  getActivityDescription: (input: unknown) => {
    const parsed = RenderMedicalTemplateInput.safeParse(input);
    if (parsed.success) return `渲染病历模板: ${parsed.data.templateId}`;
    return '渲染病历模板';
  },
});

export type RenderMedicalTemplateInputType = z.infer<typeof RenderMedicalTemplateInput>;
export type RenderMedicalTemplateOutputType = z.infer<typeof RenderMedicalTemplateOutput>;
