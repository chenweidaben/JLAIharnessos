/**
 * 健澜科技数智医院智能体 - AI生成病历初稿工具
 *
 * 工具名：generate_medical_record
 * 功能：基于问诊要点和模板生成结构化病历初稿，需医生确认后归档
 * 风险等级：medium（需要用户确认）
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { MOCK_MEDICAL_TEMPLATES, MOCK_PATIENTS } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const GenerateMedicalRecordInput = z.object({
  patientId: z.string().describe('患者ID'),
  encounterId: z.string().optional().describe('就诊ID'),
  recordType: z.string().describe('文书类型（如"门诊病历""入院记录""病程记录""出院小结"）'),
  keyPoints: z
    .array(
      z.object({
        category: z
          .enum(['主诉', '现病史', '既往史', '体格检查', '辅助检查', '诊断', '处理', '其他'])
          .describe('要点分类'),
        content: z.string().describe('要点内容'),
      }),
    )
    .min(1)
    .describe('问诊要点列表'),
  templateId: z.string().optional().describe('使用的病历模板ID'),
});

const GenerateMedicalRecordOutput = z.object({
  success: z.boolean(),
  draftId: z.string().describe('草稿ID（临时存储，未归档）'),
  recordType: z.string(),
  content: z.string().describe('结构化病历初稿全文'),
  missingInfo: z.array(
    z.object({
      field: z.string().describe('缺失字段名'),
      reason: z.string().describe('缺失原因'),
      suggestion: z.string().describe('补充建议'),
    }),
  ),
  qualityTips: z.array(z.string()).describe('质控提示'),
  confidence: z.number().min(0).max(1).describe('生成置信度'),
  generatedAt: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * AI生成病历初稿
 *
 * 基于问诊要点和模板生成结构化病历初稿。
 * 生成结果为草稿状态，需医生确认后才归档到EMR。
 *
 * @param input - 包含患者ID、文书类型、问诊要点
 * @param context - 工具执行上下文
 * @returns 病历初稿及质控提示
 */
async function executeGenerateMedicalRecord(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GenerateMedicalRecordInput.parse(input);

  const patient = MOCK_PATIENTS.find((p) => p.patientId === parsed.patientId);
  if (!patient) {
    return {
      success: false,
      error: {
        code: 'PATIENT_NOT_FOUND',
        message: `患者 ${parsed.patientId} 不存在`,
      },
    };
  }

  // 查找模板
  const template = parsed.templateId
    ? MOCK_MEDICAL_TEMPLATES.find((t) => t.templateId === parsed.templateId)
    : MOCK_MEDICAL_TEMPLATES.find((t) => t.recordType.includes(parsed.recordType));

  // 组织问诊要点
  const pointsByCategory = new Map<string, string[]>();
  for (const point of parsed.keyPoints) {
    const existing = pointsByCategory.get(point.category) ?? [];
    existing.push(point.content);
    pointsByCategory.set(point.category, existing);
  }

  // 生成病历内容
  const now = new Date().toISOString();
  const sections: string[] = [];

  sections.push(`${parsed.recordType}`);
  sections.push('');

  // 患者基本信息
  sections.push(`患者${patient.name}，${patient.gender}，${patient.age}岁。`);
  sections.push('');

  // 主诉
  const chiefComplaint = pointsByCategory.get('主诉');
  if (chiefComplaint) {
    sections.push(`主诉：${chiefComplaint.join('；')}`);
  } else {
    sections.push('主诉：[需补充]');
  }
  sections.push('');

  // 现病史
  const presentIllness = pointsByCategory.get('现病史');
  if (presentIllness) {
    sections.push(`现病史：${presentIllness.join('。')}`);
  } else {
    sections.push('现病史：[需补充详细起病情况、症状特点、诊疗经过]');
  }
  sections.push('');

  // 既往史
  const pastHistory = pointsByCategory.get('既往史');
  if (pastHistory) {
    sections.push(`既往史：${pastHistory.join('；')}`);
  } else if (patient.pastHistory.length > 0) {
    const historyText = patient.pastHistory
      .map((h) => `${h.disease}${h.diagnosedAt ? `（${h.diagnosedAt}确诊）` : ''}`)
      .join('；');
    sections.push(`既往史：${historyText}。`);
  } else {
    sections.push('既往史：[需补充]');
  }

  // 过敏史
  if (patient.allergies.length > 0) {
    const allergyText = patient.allergies
      .map((a) => `${a.allergen}（${a.reaction}，${a.severity}）`)
      .join('；');
    sections.push(`过敏史：${allergyText}。`);
  } else {
    sections.push('过敏史：否认药物及食物过敏史。');
  }
  sections.push('');

  // 体格检查
  const physicalExam = pointsByCategory.get('体格检查');
  if (physicalExam) {
    sections.push(`体格检查：${physicalExam.join('；')}`);
  } else if (patient.latestVitals.temperature !== null) {
    const v = patient.latestVitals;
    sections.push(
      `体格检查：T ${v.temperature}℃，P ${v.pulse}次/分，R ${v.respiration}次/分，BP ${v.bloodPressure}。[其余系统检查需补充]`,
    );
  } else {
    sections.push('体格检查：[需补充]');
  }
  sections.push('');

  // 辅助检查
  const auxiliaryExam = pointsByCategory.get('辅助检查');
  if (auxiliaryExam) {
    sections.push(`辅助检查：${auxiliaryExam.join('；')}`);
  } else {
    sections.push('辅助检查：[需补充相关检查结果]');
  }
  sections.push('');

  // 诊断
  const diagnosis = pointsByCategory.get('诊断');
  if (diagnosis) {
    sections.push(`初步诊断：${diagnosis.join('；')}`);
  } else {
    sections.push('初步诊断：[需医生确认]');
  }
  sections.push('');

  // 处理
  const treatment = pointsByCategory.get('处理');
  if (treatment) {
    sections.push(`处理意见：${treatment.join('；')}`);
  } else {
    sections.push('处理意见：[需医生补充]');
  }
  sections.push('');

  // 其他
  const other = pointsByCategory.get('其他');
  if (other) {
    sections.push(`其他：${other.join('；')}`);
    sections.push('');
  }

  sections.push(`[本病历由健澜科技数智医院智能体AI辅助生成，需医生审核确认后归档]`);
  sections.push(`生成时间：${now}`);

  const content = sections.join('\n');

  // 缺失信息分析
  const missingInfo: { field: string; reason: string; suggestion: string }[] = [];
  if (!chiefComplaint) {
    missingInfo.push({
      field: '主诉',
      reason: '问诊要点中未提供主诉信息',
      suggestion: '请补充患者主要症状及持续时间',
    });
  }
  if (!presentIllness) {
    missingInfo.push({
      field: '现病史',
      reason: '问诊要点中未提供现病史',
      suggestion: '请补充起病时间、症状演变、诊疗经过',
    });
  }
  if (!diagnosis) {
    missingInfo.push({
      field: '初步诊断',
      reason: '未提供诊断信息',
      suggestion: '请结合病史、体征和辅助检查明确诊断',
    });
  }

  // 质控提示
  const qualityTips: string[] = [];
  if (patient.allergies.length > 0) {
    qualityTips.push(`患者有${patient.allergies.length}项过敏史，请在用药时注意规避`);
  }
  if (parsed.recordType === '入院记录') {
    qualityTips.push('入院记录需在患者入院后24小时内完成');
    qualityTips.push('需包含完整的系统体格检查');
  }
  if (parsed.recordType === '病程记录') {
    qualityTips.push('首次病程记录需在入院后8小时内完成');
    qualityTips.push('需包含病例特点、拟诊讨论、诊疗计划三部分');
  }
  qualityTips.push('AI生成内容仅供参考，所有诊断和治疗决策需由执业医师确认');

  const draftId = `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return {
    success: true,
    data: {
      success: true,
      draftId,
      recordType: parsed.recordType,
      content,
      missingInfo,
      qualityTips,
      confidence: missingInfo.length === 0 ? 0.9 : 0.7,
      generatedAt: now,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const generateMedicalRecordTool = buildMedicalTool({
  name: 'generate_medical_record',
  description:
    '基于问诊要点和病历模板，AI生成结构化病历初稿（门诊病历/入院记录/病程记录/出院小结等）。生成结果为草稿，包含缺失信息提示和质控建议，需医生确认后归档。',
  category: MedicalToolCategory.EMR,
  riskLevel: 'medium',
  requiresAuth: true,
  requiresConfirm: true,
  requiredPermissions: ['emr:write'],
  inputSchema: GenerateMedicalRecordInput,
  outputSchema: GenerateMedicalRecordOutput,
  execute: executeGenerateMedicalRecord,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  userFacingName: () => 'AI生成病历',
  getActivityDescription: (input: unknown) => {
    const parsed = GenerateMedicalRecordInput.safeParse(input);
    return parsed.success
      ? `生成${parsed.data.recordType}初稿: 患者${parsed.data.patientId}`
      : '生成病历初稿';
  },
});

export type GenerateMedicalRecordInputType = z.infer<typeof GenerateMedicalRecordInput>;
export type GenerateMedicalRecordOutputType = z.infer<typeof GenerateMedicalRecordOutput>;
