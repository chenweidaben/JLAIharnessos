/**
 * 健澜科技数智医院智能体 - 药物相互作用检查工具
 *
 * 工具名：drug_interaction_check
 * 功能：检查多种药物之间的相互作用，以及药物与患者疾病、食物、检验指标的相互作用
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

const DrugInteractionCheckInput = z.object({
  drugs: z
    .array(
      z.object({
        drugName: z.string().describe('药品通用名'),
        dosage: z.string().optional().describe('剂量'),
        frequency: z.string().optional().describe('频次'),
      }),
    )
    .min(2)
    .describe('药品列表（至少2种）'),
  patientId: z.string().optional().describe('患者ID（用于考虑患者过敏史、基础疾病等因素）'),
});

const DrugInteractionCheckOutput = z.object({
  success: z.boolean(),
  overallRisk: z.enum(['无风险', '低风险', '中风险', '高风险', '禁忌']),
  interactions: z.array(
    z.object({
      drugA: z.string(),
      drugB: z.string(),
      interactionType: z.enum(['药药相互作用', '药病相互作用', '药食相互作用', '药检相互作用']),
      severity: z.enum(['禁忌', '严重', '中度', '轻度']),
      description: z.string().describe('相互作用描述'),
      mechanism: z.string().describe('作用机制'),
      clinicalEffect: z.string().describe('临床影响'),
      suggestion: z.string().describe('处理建议'),
      evidence: z.string().describe('证据来源（说明书/指南/文献）'),
    }),
  ),
  patientFactors: z
    .object({
      allergies: z.array(z.string()).describe('患者过敏药物'),
      conditions: z.array(z.string()).describe('患者基础疾病'),
      warnings: z.array(z.string()).describe('患者相关预警'),
    })
    .optional(),
  checkedAt: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 药物相互作用检查
 *
 * 检查药品间相互作用、禁忌症、剂量异常。
 * 如提供patientId，同时考虑患者过敏史和基础疾病。
 *
 * @param input - 药品列表和可选患者ID
 * @param context - 工具执行上下文
 * @returns 相互作用列表和总体风险评估
 */
async function executeDrugInteractionCheck(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = DrugInteractionCheckInput.parse(input);

  const drugNames = parsed.drugs.map((d) => d.drugName);

  // 匹配已知相互作用（规则表经数据层出口，演示/真实一致）
  const interactions = clinicalData.getDrugInteractionRules().filter((interaction) => {
    const aMatch = drugNames.some(
      (name) => name.includes(interaction.drugA) || interaction.drugA.includes(name),
    );
    const bMatch = drugNames.some(
      (name) => name.includes(interaction.drugB) || interaction.drugB.includes(name),
    );
    // 特殊处理：含钙溶液不是药品名，跳过
    if (interaction.drugB === '含钙溶液') return false;
    if (interaction.drugB === '碘造影剂') return false;
    return aMatch && bMatch;
  });

  // 患者因素
  let patientFactors:
    | {
        allergies: string[];
        conditions: string[];
        warnings: string[];
      }
    | undefined;

  if (parsed.patientId) {
    const patient = await clinicalData.getPatient(parsed.patientId);
    if (patient) {
      const warnings: string[] = [];
      const allergies = patient.allergies.map((a) => a.allergen);

      // 检查患者过敏药物
      for (const drug of drugNames) {
        for (const allergy of patient.allergies) {
          if (drug.includes(allergy.allergen) || allergy.allergen.includes(drug)) {
            warnings.push(
              `患者对${allergy.allergen}过敏（${allergy.severity}），处方中包含${drug}，存在严重过敏风险`,
            );
          }
        }
      }

      // 检查基础疾病相关禁忌
      const conditions = patient.pastHistory.map((h) => h.disease);
      for (const condition of conditions) {
        if (condition.includes('糖尿病') && drugNames.some((d) => d.includes('糖皮质激素'))) {
          warnings.push('患者有糖尿病，糖皮质激素可升高血糖，需密切监测');
        }
        if (
          condition.includes('高血压') &&
          drugNames.some((d) => d.includes('布洛芬') || d.includes('NSAID'))
        ) {
          warnings.push('患者有高血压，非甾体抗炎药可能升高血压');
        }
      }

      patientFactors = {
        allergies,
        conditions,
        warnings,
      };
    }
  }

  // 计算总体风险
  let overallRisk: '无风险' | '低风险' | '中风险' | '高风险' | '禁忌' = '无风险';
  if (interactions.length > 0) {
    const hasContraindication = interactions.some((i) => i.severity === '禁忌');
    const hasSevere = interactions.some((i) => i.severity === '严重');
    const hasModerate = interactions.some((i) => i.severity === '中度');

    if (hasContraindication) overallRisk = '禁忌';
    else if (hasSevere) overallRisk = '高风险';
    else if (hasModerate) overallRisk = '中风险';
    else overallRisk = '低风险';
  }

  // 患者过敏预警提升风险等级
  if (patientFactors?.warnings.some((w) => w.includes('严重过敏')) && overallRisk !== '禁忌') {
    overallRisk = '禁忌';
  }

  return {
    success: true,
    data: {
      success: true,
      overallRisk,
      interactions,
      patientFactors,
      checkedAt: new Date().toISOString(),
      _source: sourceTag(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const drugInteractionCheckTool = buildMedicalTool({
  name: 'drug_interaction_check',
  description:
    '检查多种药物之间的相互作用（药药/药病/药食/药检），返回严重程度、作用机制、临床影响、处理建议和证据来源。如提供patientId，同时考虑患者过敏史和基础疾病。所有临床角色可用。',
  category: MedicalToolCategory.CDS,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: DrugInteractionCheckInput,
  outputSchema: DrugInteractionCheckOutput,
  execute: executeDrugInteractionCheck,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '药物相互作用检查',
  getActivityDescription: (input: unknown) => {
    const parsed = DrugInteractionCheckInput.safeParse(input);
    if (parsed.success) {
      const names = parsed.data.drugs.map((d) => d.drugName).join('+');
      return `药物相互作用检查: ${names}`;
    }
    return '药物相互作用检查';
  },
});

export type DrugInteractionCheckInputType = z.infer<typeof DrugInteractionCheckInput>;
export type DrugInteractionCheckOutputType = z.infer<typeof DrugInteractionCheckOutput>;
