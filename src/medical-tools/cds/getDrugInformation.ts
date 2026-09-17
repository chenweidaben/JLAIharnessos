/**
 * 健澜科技数智医院智能体 - 药品信息查询工具
 *
 * 工具名：get_drug_information
 * 功能：根据药品通用名查询药品说明书信息（适应症、用法用量、禁忌、不良反应、相互作用等）
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { MOCK_DRUG_LABELS } from '@knowledge/mock/mockKnowledgeBase';
import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const GetDrugInformationInput = z.object({
  drugName: z.string().min(1).describe('药品通用名（如 阿司匹林、阿托伐他汀）'),
  infoType: z
    .enum(['适应症', '用法用量', '禁忌', '不良反应', '相互作用', '全部'])
    .default('全部')
    .describe('查询的信息类型，默认返回全部章节'),
});

const GetDrugInformationOutput = z.object({
  success: z.boolean(),
  drugName: z.string(),
  tradeName: z.string().optional(),
  sections: z.object({
    适应症: z.string().optional(),
    用法用量: z.string().optional(),
    禁忌: z.string().optional(),
    不良反应: z.string().optional(),
    药物相互作用: z.string().optional(),
    注意事项: z.string().optional(),
  }),
  found: z.boolean(),
  note: z.string().optional(),
  queriedAt: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 在 Mock 药品库中按通用名模糊匹配药品说明书。
 *
 * @param name - 用户输入的药品名
 * @returns 匹配到的条目 key 与数据，未命中返回 undefined
 */
function lookupDrug(
  name: string,
): { key: string; data: (typeof MOCK_DRUG_LABELS)[string] } | undefined {
  const trimmed = name.trim();
  // 1. 精确匹配
  if (MOCK_DRUG_LABELS[trimmed]) {
    return { key: trimmed, data: MOCK_DRUG_LABELS[trimmed] };
  }
  // 2. 包含匹配
  for (const [key, data] of Object.entries(MOCK_DRUG_LABELS)) {
    if (key.includes(trimmed) || trimmed.includes(key)) {
      return { key, data };
    }
    if (data.tradeName && (data.tradeName.includes(trimmed) || trimmed.includes(data.tradeName))) {
      return { key, data };
    }
  }
  return undefined;
}

/**
 * 药品信息查询。
 *
 * 按章节组织返回药品说明书信息；查询特定章节时仅返回对应内容。
 */
async function executeGetDrugInformation(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<z.infer<typeof GetDrugInformationOutput>>> {
  const parsed = GetDrugInformationInput.parse(input);

  const hit = lookupDrug(parsed.drugName);
  if (!hit) {
    return {
      success: true,
      data: {
        success: true,
        drugName: parsed.drugName,
        sections: {},
        found: false,
        note: `未在药品知识库中找到"${parsed.drugName}"，请核对通用名。已收录常用药品：${Object.keys(MOCK_DRUG_LABELS).join('、')}`,
        queriedAt: new Date().toISOString(),
      },
    };
  }

  const d = hit.data;
  const want = parsed.infoType;
  const allSections = {
    适应症: d.indications,
    用法用量: d.dosage,
    禁忌: d.contraindications,
    不良反应: d.adverseReactions,
    药物相互作用: d.interactions,
    注意事项: d.precautions,
  };

  let sections: Partial<typeof allSections>;
  if (want === '全部') {
    sections = { ...allSections };
  } else if (want === '相互作用') {
    sections = { 药物相互作用: allSections.药物相互作用 };
  } else {
    // 映射到具体章节
    const key = want as keyof typeof allSections;
    sections = { [key]: allSections[key] };
  }

  return {
    success: true,
    data: {
      success: true,
      drugName: d.drugName,
      tradeName: d.tradeName,
      sections,
      found: true,
      note: '本信息为 Mock 说明书内容，仅供开发演示，临床用药以最新版正式说明书及医嘱为准。',
      queriedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const getDrugInformationTool = buildMedicalTool({
  name: 'get_drug_information',
  description:
    '查询药品说明书信息，按章节返回适应症、用法用量、禁忌、不良反应、药物相互作用、注意事项。' +
    '支持按章节查询。输入药品通用名。返回内容为 Mock 说明书数据，供临床用药参考。',
  category: MedicalToolCategory.CDS,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: GetDrugInformationInput,
  outputSchema: GetDrugInformationOutput,
  execute: executeGetDrugInformation,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '药品信息查询',
  getActivityDescription: (input: unknown) => {
    const parsed = GetDrugInformationInput.safeParse(input);
    if (parsed.success) return `药品信息查询: ${parsed.data.drugName}`;
    return '药品信息查询';
  },
});

export type GetDrugInformationInputType = z.infer<typeof GetDrugInformationInput>;
