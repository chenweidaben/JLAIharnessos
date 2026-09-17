/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 治疗方案建议工具
 * ---------------------------------------------------------------------------
 * 工具名：treatment_plan_suggestion
 * 基于诊断、严重程度、合并症与过敏史，给出药物治疗、非药物治疗、生活方式
 * 干预与随访计划。当前为规则+Mock 实现。所有方案仅供医生参考确认。
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// Schema
// ============================================================================

const TreatmentPlanSuggestionInput = z.object({
  patientId: z.string().optional(),
  diagnosis: z.string().describe('主要诊断'),
  severity: z.enum(['轻度', '中度', '重度', '危重']).optional().describe('严重程度'),
  comorbidities: z.array(z.string()).optional().describe('合并症'),
  allergies: z.array(z.string()).optional().describe('过敏史'),
});

const DrugItem = z.object({
  drugName: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  route: z.string(),
  duration: z.string(),
  rationale: z.string(),
  monitoring: z.string(),
});

const TreatmentPlanSuggestionOutput = z.object({
  success: z.boolean(),
  pharmacological: z.array(DrugItem),
  nonPharmacological: z.array(z.string()),
  lifestyle: z.array(z.string()),
  followupPlan: z.object({
    followupTime: z.string(),
    followupItems: z.array(z.string()),
    redFlags: z.array(z.string()),
  }),
  contraindications: z.array(z.string()),
  guidelineReferences: z.array(z.string()),
  disclaimer: z.string(),
});

// ============================================================================
// 工具实现（规则+Mock）
// ============================================================================

/**
 * 依据诊断关键词与严重程度，套用模拟治疗方案。
 */
async function executeTreatmentPlanSuggestion(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = TreatmentPlanSuggestionInput.parse(input);
  const diag = parsed.diagnosis;
  const severity = parsed.severity ?? '中度';
  const allergies = parsed.allergies ?? [];
  const comorbidities = parsed.comorbidities ?? [];

  const pharmacological: {
    drugName: string;
    dosage: string;
    frequency: string;
    route: string;
    duration: string;
    rationale: string;
    monitoring: string;
  }[] = [];
  const contraindications: string[] = [];

  // 肺炎 → 经验性抗感染
  if (diag.includes('肺炎')) {
    // 过敏提示：青霉素/头孢过敏时规避
    if (allergies.some((a) => a.includes('青霉素') || a.includes('头孢'))) {
      contraindications.push('患者有β-内酰胺类过敏史，建议选用大环内酯类/呼吸喹诺酮类替代');
      pharmacological.push({
        drugName: '阿奇霉素片',
        dosage: '0.5g',
        frequency: 'qd',
        route: '口服',
        duration: '3~5天',
        rationale: '覆盖非典型病原体的经验性治疗',
        monitoring: '监测胃肠道反应、肝功能',
      });
    } else {
      pharmacological.push({
        drugName: '阿莫西林克拉维酸钾',
        dosage: '1.2g',
        frequency: 'q8h',
        route: '静脉滴注',
        duration: '5~7天',
        rationale: '覆盖肺炎链球菌等常见社区获得性病原体',
        monitoring: '用药前确认无青霉素过敏，监测体温与血象',
      });
    }
  }

  // 高血压/冠心病 → 二级预防
  if (diag.includes('高血压') || diag.includes('冠心病') || diag.includes('心绞痛')) {
    pharmacological.push({
      drugName: '阿司匹林肠溶片',
      dosage: '100mg',
      frequency: 'qd',
      route: '口服',
      duration: '长期',
      rationale: '抗血小板二级预防',
      monitoring: '监测出血征象、大便潜血',
    });
    pharmacological.push({
      drugName: '阿托伐他汀钙片',
      dosage: '20mg',
      frequency: 'qn',
      route: '口服',
      duration: '长期',
      rationale: '调脂稳定斑块',
      monitoring: '监测肝功能与肌酸激酶',
    });
  }

  // 糖尿病
  if (diag.includes('糖尿病')) {
    pharmacological.push({
      drugName: '二甲双胍缓释片',
      dosage: '0.5g',
      frequency: 'bid',
      route: '口服',
      duration: '长期',
      rationale: '2型糖尿病一线用药',
      monitoring: '监测空腹/餐后血糖、肾功能',
    });
    if (comorbidities.some((c) => c.includes('肾功能'))) {
      contraindications.push('合并肾功能不全时二甲双胍需按eGFR减量或停用');
    }
  }

  // 兜底：对症
  if (pharmacological.length === 0) {
    pharmacological.push({
      drugName: '对症支持治疗（遵医嘱）',
      dosage: '按个体',
      frequency: '按个体',
      route: '口服/静脉',
      duration: '按疗程',
      rationale: '当前诊断暂无固定方案，建议结合指南个体化制定',
      monitoring: '用药期间监测疗效与不良反应',
    });
  }

  // 危重/重度提示住院
  if (severity === '危重' || severity === '重度') {
    contraindications.push('病情较重，建议住院/ICU监护下治疗');
  }

  return {
    success: true,
    data: {
      success: true,
      pharmacological,
      nonPharmacological: ['卧床休息，必要时吸氧', '纠正水电解质与酸碱失衡', '营养支持'],
      lifestyle: [
        '戒烟限酒',
        '低盐低脂糖尿病饮食',
        '适度活动，避免劳累',
        '规律作息，监测体重/血压/血糖',
      ],
      followupPlan: {
        followupTime: severity === '轻度' ? '2周后门诊复诊' : '3~7天后复诊',
        followupItems: ['复查相关检验指标', '评估疗效并调整方案', '评估药物不良反应'],
        redFlags: ['症状加重/持续高热不退立即就诊', '出现呼吸困难/胸痛/意识改变立即急诊'],
      },
      contraindications,
      guidelineReferences: [
        '社区获得性肺炎诊断和治疗指南（2016）',
        '中国高血压防治指南（2024）',
        '中国2型糖尿病防治指南（2024）',
      ],
      disclaimer: '以上治疗方案仅供参考，具体方案请由执业医师根据患者情况确定',
    },
  };
}

// ============================================================================
// 导出
// ============================================================================

export const treatmentPlanSuggestionTool = buildMedicalTool({
  name: 'treatment_plan_suggestion',
  description:
    '基于诊断、严重程度、合并症与过敏史，给出药物治疗、非药物治疗、生活方式干预、随访计划与指南依据。仅作参考，需医生确认。输入patientId、diagnosis，可选severity/comorbidities/allergies。',
  category: MedicalToolCategory.CDS,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: TreatmentPlanSuggestionInput,
  outputSchema: TreatmentPlanSuggestionOutput,
  execute: executeTreatmentPlanSuggestion,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '治疗方案建议',
  getActivityDescription: () => '生成治疗方案建议',
});

export type TreatmentPlanSuggestionInputType = z.infer<typeof TreatmentPlanSuggestionInput>;
export type TreatmentPlanSuggestionOutputType = z.infer<typeof TreatmentPlanSuggestionOutput>;
