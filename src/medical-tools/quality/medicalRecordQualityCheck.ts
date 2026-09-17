/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 病历质控工具
 * ---------------------------------------------------------------------------
 * 工具名：medical_record_quality_check
 * 对病历进行完整性质控、规范性质控与逻辑质控，输出质控得分、缺陷列表与
 * 整改建议。当前为 Mock 实现，返回符合真实质控标准的模拟结果。
 * 结果仅供质控参考，最终判定以质控医师为准。
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// Schema
// ============================================================================

/** 质控类型 */
const CheckTypeEnum = z.enum(['完整性质控', '规范性质控', '逻辑质控']);

const MedicalRecordQualityCheckInput = z
  .object({
    recordId: z.string().optional().describe('病历ID（与recordContent二选一）'),
    recordContent: z.string().optional().describe('病历正文内容（与recordId二选一）'),
    checkType: CheckTypeEnum.optional().describe('质控类型，缺省全部检查'),
  })
  .refine((v) => v.recordId !== undefined || v.recordContent !== undefined, {
    message: 'recordId 与 recordContent 必须提供其一',
  });

const QualityIssue = z.object({
  ruleNo: z.number().describe('规则编号'),
  ruleName: z.string().describe('规则名称'),
  checkType: z.string().describe('质控类型'),
  severity: z.enum(['严重', '一般']).describe('严重程度'),
  scoreDeduction: z.number().describe('扣分值'),
  description: z.string().describe('缺陷描述'),
  location: z.string().describe('缺陷位置/字段'),
  suggestion: z.string().describe('整改建议'),
});

const MedicalRecordQualityCheckOutput = z.object({
  success: z.boolean(),
  qcScore: z.number().describe('质控得分（百分制）'),
  grade: z.enum(['甲级', '乙级', '丙级']).describe('病历质量等级'),
  issues: z.array(QualityIssue).describe('缺陷列表'),
  statistics: z.object({
    totalChecks: z.number(),
    passedChecks: z.number(),
    failedChecks: z.number(),
    severeIssues: z.number(),
    normalIssues: z.number(),
  }),
  ruleHits: z.array(z.string()).describe('命中规则编号'),
  disclaimer: z.string().default('本质控结果仅供参考，最终以质控医师判定为准'),
  checkedAt: z.string(),
});

// ============================================================================
// 质控规则（Mock）
// ============================================================================

/** 全部质控缺陷模板（含完整/规范/逻辑三类） */
interface DefectTemplate {
  ruleNo: number;
  ruleName: string;
  checkType: '完整性质控' | '规范性质控' | '逻辑质控';
  severity: '严重' | '一般';
  scoreDeduction: number;
  description: string;
  location: string;
  suggestion: string;
}

const DEFECT_TEMPLATES: readonly DefectTemplate[] = [
  {
    ruleNo: 101,
    ruleName: '主诉缺失或不规范',
    checkType: '完整性质控',
    severity: '严重',
    scoreDeduction: 10,
    description: '主诉未描述主要症状+部位+持续时间',
    location: '主诉栏',
    suggestion: '按"症状+部位+时间"规范书写，不超过20个字',
  },
  {
    ruleNo: 102,
    ruleName: '现病史未与主诉呼应',
    checkType: '逻辑质控',
    severity: '一般',
    scoreDeduction: 5,
    description: '现病史未围绕主诉展开，缺乏起病情况与演变',
    location: '现病史',
    suggestion: '补充发病诱因、主要症状特点、诊治经过',
  },
  {
    ruleNo: 103,
    ruleName: '体格检查记录不完整',
    checkType: '完整性质控',
    severity: '一般',
    scoreDeduction: 5,
    description: '缺少生命体征或相关系统查体记录',
    location: '体格检查',
    suggestion: '补充体温、脉搏、呼吸、血压及专科查体',
  },
  {
    ruleNo: 201,
    ruleName: '诊断术语不规范',
    checkType: '规范性质控',
    severity: '一般',
    scoreDeduction: 3,
    description: '使用俗称/简称，未采用ICD-10规范诊断名称',
    location: '初步诊断',
    suggestion: '改用规范诊断名称并补充ICD编码',
  },
  {
    ruleNo: 202,
    ruleName: '时间逻辑矛盾',
    checkType: '逻辑质控',
    severity: '严重',
    scoreDeduction: 8,
    description: '病程记录时间早于入院记录时间',
    location: '时间轴',
    suggestion: '核对入院时间与各病程记录时间先后',
  },
  {
    ruleNo: 203,
    ruleName: '医师签名缺失',
    checkType: '完整性质控',
    severity: '严重',
    scoreDeduction: 10,
    description: '病程记录缺少书写医师电子签名',
    location: '病程记录',
    suggestion: '完成医师电子签名，保证记录可追溯',
  },
  {
    ruleNo: 301,
    ruleName: '诊断与治疗不匹配',
    checkType: '逻辑质控',
    severity: '一般',
    scoreDeduction: 5,
    description: '诊断为社区获得性肺炎但未开具抗感染药物',
    location: '诊断/医嘱',
    suggestion: '评估诊断与治疗一致性，必要时补充抗感染医嘱',
  },
  {
    ruleNo: 302,
    ruleName: '用药与诊断无关联',
    checkType: '逻辑质控',
    severity: '一般',
    scoreDeduction: 3,
    description: '存在与本次诊断无关的长期医嘱未说明理由',
    location: '医嘱',
    suggestion: '补充用药理由或在病程中说明',
  },
];

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 病历质控：根据质控类型筛选缺陷模板，生成质控得分与报告。
 */
async function executeMedicalRecordQualityCheck(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = MedicalRecordQualityCheckInput.parse(input);

  const scoped = parsed.checkType
    ? DEFECT_TEMPLATES.filter((d) => d.checkType === parsed.checkType)
    : DEFECT_TEMPLATES;

  // 以 recordContent 是否提供作为“已提供病历文本”的模拟：提供则认为部分缺陷已被修复
  const hasContent =
    typeof parsed.recordContent === 'string' && parsed.recordContent.trim().length > 0;
  const issues = hasContent ? scoped.filter((_, i) => i % 2 === 0) : scoped;

  const totalDeduction = issues.reduce((sum, i) => sum + i.scoreDeduction, 0);
  const qcScore = Math.max(0, Math.min(100, 100 - totalDeduction));
  const grade = qcScore >= 90 ? '甲级' : qcScore >= 75 ? '乙级' : '丙级';

  const severeIssues = issues.filter((i) => i.severity === '严重').length;
  const normalIssues = issues.length - severeIssues;
  const totalChecks = 20;
  const failedChecks = issues.length;

  return {
    success: true,
    data: {
      success: true,
      qcScore,
      grade,
      issues: issues.map(
        ({
          ruleNo,
          ruleName,
          checkType,
          severity,
          scoreDeduction,
          description,
          location,
          suggestion,
        }) => ({
          ruleNo,
          ruleName,
          checkType,
          severity,
          scoreDeduction,
          description,
          location,
          suggestion,
        }),
      ),
      statistics: {
        totalChecks,
        passedChecks: totalChecks - failedChecks,
        failedChecks,
        severeIssues,
        normalIssues,
      },
      ruleHits: issues.map((i) => `RULE-${i.ruleNo}`),
      disclaimer: '本质控结果仅供参考，最终以质控医师判定为准',
      checkedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// 导出
// ============================================================================

export const medicalRecordQualityCheckTool = buildMedicalTool({
  name: 'medical_record_quality_check',
  description:
    '对病历进行完整性质控、规范性质控与逻辑质控，输出质控得分（百分制/甲乙丙级）、缺陷列表与整改建议。输入recordId或recordContent，可指定checkType。结果仅供质控参考。',
  category: MedicalToolCategory.QC,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: MedicalRecordQualityCheckInput,
  outputSchema: MedicalRecordQualityCheckOutput,
  execute: executeMedicalRecordQualityCheck,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '病历质控',
  getActivityDescription: () => '病历质量控制检查',
});

export type MedicalRecordQualityCheckInputType = z.infer<typeof MedicalRecordQualityCheckInput>;
export type MedicalRecordQualityCheckOutputType = z.infer<typeof MedicalRecordQualityCheckOutput>;
