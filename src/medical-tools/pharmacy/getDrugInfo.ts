/**
 * 健澜科技数智医院智能体 - 药品信息查询工具
 *
 * 工具名：get_drug_info
 * 功能：按药品通用名查询内置药品说明书（适应症、用法用量、禁忌、相互作用等）
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';
import { DRUG_CATALOG, type DrugInfo, findDrugInfo } from './drugCatalog.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const GetDrugInfoInput = z.object({
  drugName: z.string().min(1).describe('药品通用名（支持模糊匹配，如"阿司匹林""二甲双胍"）'),
  infoType: z
    .enum([
      'all',
      'indication',
      'dosage',
      'adverse',
      'contraindication',
      'precaution',
      'interaction',
    ])
    .default('all')
    .describe(
      '查询信息类型：all全部 / indication适应症 / dosage用法用量 / adverse不良反应 / contraindication禁忌 / precaution注意事项 / interaction相互作用',
    ),
});

const GetDrugInfoOutput = z.object({
  success: z.boolean(),
  drugName: z.string().describe('匹配到的药品通用名'),
  category: z.string(),
  dosageForm: z.string(),
  specification: z.string(),
  insurance: z.string(),
  infoType: z.string(),
  // 全量字段
  indication: z.string().optional(),
  dosage: z.string().optional(),
  adverseReactions: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  precautions: z.array(z.string()).optional(),
  interactions: z.array(z.string()).optional(),
  matchedBy: z.string().describe('匹配方式（通用名/别名）'),
  notice: z.string().describe('免责声明'),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 药品信息查询
 *
 * 按药品通用名/别名在本地药品目录中模糊匹配，返回说明书信息。
 * 可通过 infoType 仅返回某一类信息。
 *
 * @param input - 药品名称与信息类型
 * @param _context - 工具执行上下文
 * @returns 药品说明书信息
 */
async function executeGetDrugInfo(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GetDrugInfoInput.parse(input);

  const drug = findDrugInfo(parsed.drugName);
  if (!drug) {
    // 提供可用药品列表作为提示
    return {
      success: false,
      error: {
        code: 'DRUG_NOT_FOUND',
        message: `未在药品目录中找到"${parsed.drugName}"`,
        details: {
          availableDrugs: DRUG_CATALOG.map((d) => d.genericName),
        },
      },
    };
  }

  // 判断匹配方式
  const matchedBy =
    drug.genericName.includes(parsed.drugName.trim()) && drug.genericName === parsed.drugName.trim()
      ? '通用名'
      : drug.genericName.includes(parsed.drugName.trim()) ||
          parsed.drugName.trim().includes(drug.genericName)
        ? '通用名(模糊)'
        : '别名';

  const base = {
    success: true,
    drugName: drug.genericName,
    category: drug.category,
    dosageForm: drug.dosageForm,
    specification: drug.specification,
    insurance: drug.insurance,
    infoType: parsed.infoType,
    matchedBy,
    notice: '本信息来源于内置药品说明书（Mock），仅供临床参考，实际用药请以现行说明书和医嘱为准。',
  };

  // 按 infoType 裁剪返回
  switch (parsed.infoType) {
    case 'indication':
      return { success: true, data: { ...base, indication: drug.indication } };
    case 'dosage':
      return { success: true, data: { ...base, dosage: drug.dosage } };
    case 'adverse':
      return { success: true, data: { ...base, adverseReactions: drug.adverseReactions } };
    case 'contraindication':
      return { success: true, data: { ...base, contraindications: drug.contraindications } };
    case 'precaution':
      return { success: true, data: { ...base, precautions: drug.precautions } };
    case 'interaction':
      return { success: true, data: { ...base, interactions: drug.interactions } };
    case 'all':
    default:
      return {
        success: true,
        data: {
          ...base,
          indication: drug.indication,
          dosage: drug.dosage,
          adverseReactions: drug.adverseReactions,
          contraindications: drug.contraindications,
          precautions: drug.precautions,
          interactions: drug.interactions,
        },
      };
  }
}

// ============================================================================
// 工具导出
// ============================================================================

export const getDrugInfoTool = buildMedicalTool({
  name: 'get_drug_info',
  description:
    '按药品通用名查询内置药品说明书，支持适应症、用法用量、不良反应、禁忌、注意事项、药物相互作用等分类查询。内置15种常用药品（阿司匹林、氯吡格雷、阿托伐他汀、美托洛尔、氨氯地平、左氧氟沙星、奥美拉唑、二甲双胍、胰岛素、头孢呋辛、布洛芬、氨溴索、硝苯地平、缬沙坦、华法林）。',
  category: MedicalToolCategory.PRESCRIPTION,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['drug:read'],
  inputSchema: GetDrugInfoInput,
  outputSchema: GetDrugInfoOutput,
  execute: executeGetDrugInfo,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '药品信息查询',
  getActivityDescription: (input: unknown) => {
    const parsed = GetDrugInfoInput.safeParse(input);
    return parsed.success ? `药品信息: ${parsed.data.drugName}` : '药品信息查询';
  },
});

export type GetDrugInfoInputType = z.infer<typeof GetDrugInfoInput>;
export type GetDrugInfoOutputType = z.infer<typeof GetDrugInfoOutput>;

/** 导出目录类型，便于其他模块复用 */
export type { DrugInfo };
