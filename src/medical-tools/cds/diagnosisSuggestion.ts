/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 诊断建议工具
 * ---------------------------------------------------------------------------
 * 工具名：diagnosis_suggestion
 * 基于症状、体征、检验检查结果，给出可能诊断列表、鉴别诊断与建议检查。
 * 当前为规则+Mock 实现，不做真实诊断推理。所有建议仅供参考，需医生确认。
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// Schema
// ============================================================================

const DiagnosisSuggestionInput = z.object({
  patientId: z.string().optional().describe('患者ID'),
  symptoms: z.array(z.string()).min(1).describe('症状列表'),
  signs: z.array(z.string()).optional().describe('体征列表'),
  labResults: z
    .array(
      z.object({
        testName: z.string(),
        value: z.union([z.string(), z.number()]),
        abnormal: z.boolean().optional(),
      }),
    )
    .optional()
    .describe('检验结果'),
  imagingFindings: z.string().optional().describe('影像所见'),
});

const DiagnosisSuggestionOutput = z.object({
  success: z.boolean(),
  possibleDiagnoses: z.array(
    z.object({
      diagnosis: z.string(),
      icd10: z.string().nullable(),
      probability: z.enum(['高', '中', '低']),
      confidence: z.number().min(0).max(1),
      supportingEvidence: z.array(z.string()),
      opposingEvidence: z.array(z.string()),
    }),
  ),
  differentialDiagnosis: z.array(
    z.object({
      diagnosisA: z.string(),
      diagnosisB: z.string(),
      keyDistinguishingFeatures: z.array(z.string()),
      recommendedTests: z.array(z.string()),
    }),
  ),
  recommendedWorkup: z.array(z.string()),
  redFlags: z.array(z.string()),
  disclaimer: z.string(),
});

// ============================================================================
// 工具实现（规则+Mock）
// ============================================================================

/**
 * 依据输入关键词匹配套用模拟诊断方向。
 */
async function executeDiagnosisSuggestion(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = DiagnosisSuggestionInput.parse(input);
  const symptomText = parsed.symptoms.join('、');
  const signText = (parsed.signs ?? []).join('、');
  const labText = (parsed.labResults ?? []).map((l) => `${l.testName}=${l.value}`).join('、');
  const joined = `${symptomText}${signText}${labText}${parsed.imagingFindings ?? ''}`;

  const possibleDiagnoses: {
    diagnosis: string;
    icd10: string | null;
    probability: '高' | '中' | '低';
    confidence: number;
    supportingEvidence: string[];
    opposingEvidence: string[];
  }[] = [];

  // 胸痛 + 肌钙蛋白 → 急性冠脉综合征
  if (joined.includes('胸痛') && (joined.includes('肌钙蛋白') || joined.includes('心电图'))) {
    possibleDiagnoses.push({
      diagnosis: '急性冠脉综合征（急性ST段抬高型心肌梗死待排）',
      icd10: 'I21.900',
      probability: '高',
      confidence: 0.82,
      supportingEvidence: [`主诉${symptomText}`, '肌钙蛋白/心电图异常待结合'],
      opposingEvidence: ['需排除主动脉夹层、肺栓塞等致命性胸痛'],
    });
  }
  // 发热 + 咳嗽 + 白细胞 → 社区获得性肺炎
  if (joined.includes('发热') && joined.includes('咳嗽')) {
    possibleDiagnoses.push({
      diagnosis: '社区获得性肺炎',
      icd10: 'J18.900',
      probability: '中',
      confidence: 0.66,
      supportingEvidence: [`症状：${symptomText}`, '呼吸道症状伴感染征象'],
      opposingEvidence: ['需结合胸部影像与病原学确认'],
    });
  }
  // 腹痛
  if (joined.includes('腹痛')) {
    possibleDiagnoses.push({
      diagnosis: '急性阑尾炎（待排）',
      icd10: 'K35.900',
      probability: '中',
      confidence: 0.55,
      supportingEvidence: ['急性腹痛主诉', '需关注转移性右下腹痛与腹膜刺激征'],
      opposingEvidence: ['需排除泌尿系结石、妇科急症、消化性溃疡穿孔'],
    });
  }
  // 头痛 + 血压高
  if (joined.includes('头痛') && joined.includes('血压')) {
    possibleDiagnoses.push({
      diagnosis: '高血压急症/高血压性头痛',
      icd10: 'I10.x00',
      probability: '低',
      confidence: 0.45,
      supportingEvidence: ['头痛伴血压升高'],
      opposingEvidence: ['需排除颅内出血、颅内占位等'],
    });
  }
  // 默认兜底：上呼吸道感染/非特异性症状
  if (possibleDiagnoses.length === 0) {
    possibleDiagnoses.push({
      diagnosis: '上呼吸道感染（待进一步明确）',
      icd10: 'J06.900',
      probability: '中',
      confidence: 0.5,
      supportingEvidence: [`症状：${symptomText}`],
      opposingEvidence: ['信息有限，需结合查体与辅助检查'],
    });
  }

  const redFlags: string[] = [];
  if (joined.includes('胸痛')) redFlags.push('突发压榨样胸痛伴大汗/濒死感，警惕急性心梗');
  if (joined.includes('呼吸困难')) redFlags.push('呼吸困难伴口唇发绀，警惕呼吸衰竭/肺栓塞');
  if (joined.includes('意识')) redFlags.push('意识改变需立即评估神经系统');

  return {
    success: true,
    data: {
      success: true,
      possibleDiagnoses: possibleDiagnoses.slice(0, 5),
      differentialDiagnosis: [
        {
          diagnosisA: '急性冠脉综合征',
          diagnosisB: '主动脉夹层',
          keyDistinguishingFeatures: [
            '疼痛性质与放射部位',
            '双侧上肢血压差',
            'D-二聚体与主动脉CTA',
          ],
          recommendedTests: ['主动脉CTA', 'D-二聚体'],
        },
        {
          diagnosisA: '社区获得性肺炎',
          diagnosisB: '肺结核',
          keyDistinguishingFeatures: ['病程与发热规律', '胸部影像形态', '病原学/痰找抗酸杆菌'],
          recommendedTests: ['胸部CT', '痰培养+结核相关检查'],
        },
      ],
      recommendedWorkup: ['12导联心电图', '血常规+CRP+PCT', '胸部影像', '生化全套'],
      redFlags,
      disclaimer: '以上诊断建议仅供参考，最终诊断请由执业医师确定',
    },
  };
}

// ============================================================================
// 导出
// ============================================================================

export const diagnosisSuggestionTool = buildMedicalTool({
  name: 'diagnosis_suggestion',
  description:
    '基于症状、体征、检验与影像结果，给出可能诊断列表、置信度、支持/不支持证据、鉴别诊断与建议检查。仅作参考，不替代医生诊断。输入patientId、symptoms[]，可选signs/labResults/imagingFindings。',
  category: MedicalToolCategory.CDS,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: DiagnosisSuggestionInput,
  outputSchema: DiagnosisSuggestionOutput,
  execute: executeDiagnosisSuggestion,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '诊断建议',
  getActivityDescription: () => '生成诊断建议与鉴别诊断',
});

export type DiagnosisSuggestionInputType = z.infer<typeof DiagnosisSuggestionInput>;
export type DiagnosisSuggestionOutputType = z.infer<typeof DiagnosisSuggestionOutput>;
