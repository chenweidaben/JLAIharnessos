/**
 * 健澜科技数智医院智能体 - 病历质量检查工具
 *
 * 工具名：medical_record_qa
 * 功能：对病历文书进行质量检查，包括完整性、规范性、逻辑一致性、时限合规性
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const MedicalRecordQaInput = z.object({
  recordId: z.string().optional().describe('病历文书ID'),
  recordContent: z.string().optional().describe('直接传入病历内容进行检查（与recordId二选一）'),
  recordType: z.string().default('门诊病历').describe('文书类型，用于匹配质控规则'),
  checkTypes: z
    .array(
      z.enum(['completeness', 'standardness', 'logic_consistency', 'timeliness', 'cross_record']),
    )
    .default(['completeness', 'standardness', 'timeliness'])
    .describe('检查类型'),
});

const MedicalRecordQaOutput = z.object({
  success: z.boolean(),
  qcScore: z.number().describe('质控得分（百分制）'),
  issues: z.array(
    z.object({
      issueId: z.string(),
      severity: z.enum(['严重', '一般', '提示']),
      checkType: z.string(),
      ruleName: z.string(),
      description: z.string().describe('问题描述'),
      location: z.string().describe('问题定位（文书/段落/字段）'),
      suggestion: z.string().describe('修改建议'),
      scoreDeduction: z.number().describe('扣分值'),
      ruleRef: z.string().describe('规则依据引用'),
    }),
  ),
  summary: z.object({
    totalIssues: z.number(),
    severeCount: z.number(),
    normalCount: z.number(),
    infoCount: z.number(),
  }),
  checkedAt: z.string(),
});

// ============================================================================
// Mock质控规则与结果
// ============================================================================

interface QcIssue {
  issueId: string;
  severity: '严重' | '一般' | '提示';
  checkType: string;
  ruleName: string;
  description: string;
  location: string;
  suggestion: string;
  scoreDeduction: number;
  ruleRef: string;
}

const MOCK_QC_ISSUES: QcIssue[] = [
  {
    issueId: 'QC-001',
    severity: '严重',
    checkType: 'completeness',
    ruleName: '主诉缺失',
    description: '病历中未记录主诉，或主诉描述不完整（缺少症状+持续时间）。',
    location: '主诉字段',
    suggestion: '请补充主诉，格式为"主要症状+持续时间"，如"胸痛3天加重1天"。',
    scoreDeduction: 10,
    ruleRef: '《病历书写基本规范》第十条',
  },
  {
    issueId: 'QC-002',
    severity: '严重',
    checkType: 'completeness',
    ruleName: '现病史过简',
    description: '现病史描述过于简略，未涵盖起病情况、主要症状特点、伴随症状、诊疗经过和一般情况。',
    location: '现病史段落',
    suggestion:
      '请详细描述现病史，包括：起病时间与诱因、主要症状部位/性质/程度/持续时间、伴随症状、病情演变、诊疗经过、发病以来一般情况。',
    scoreDeduction: 8,
    ruleRef: '《病历书写基本规范》第十一条',
  },
  {
    issueId: 'QC-003',
    severity: '一般',
    checkType: 'completeness',
    ruleName: '既往史不完整',
    description: '既往史未系统记录，缺少手术史、外伤史、输血史或预防接种史。',
    location: '既往史段落',
    suggestion:
      '请补充既往史，包括：既往健康状况、疾病史、手术史、外伤史、输血史、过敏史、预防接种史。',
    scoreDeduction: 5,
    ruleRef: '《病历书写基本规范》第十二条',
  },
  {
    issueId: 'QC-004',
    severity: '一般',
    checkType: 'standardness',
    ruleName: '诊断术语不规范',
    description: '初步诊断使用了非标准医学术语或症状描述代替疾病诊断，如"肚子疼""不舒服"。',
    location: '初步诊断字段',
    suggestion: '请使用ICD-10标准疾病名称，如"急性胃炎"而非"肚子疼"。',
    scoreDeduction: 5,
    ruleRef: 'ICD-10疾病分类标准',
  },
  {
    issueId: 'QC-005',
    severity: '一般',
    checkType: 'standardness',
    ruleName: '药物用法不规范',
    description: '医嘱中药物用法描述不规范，缺少剂量、频次或给药途径，如"阿司匹林吃着"。',
    location: '处理意见-用药部分',
    suggestion:
      '请规范书写药物用法，格式为"药品名+剂量+频次+给药途径+疗程"，如"阿司匹林肠溶片100mg qd 口服"。',
    scoreDeduction: 5,
    ruleRef: '《处方管理办法》第六条',
  },
  {
    issueId: 'QC-006',
    severity: '提示',
    checkType: 'logic_consistency',
    ruleName: '诊断与体征不一致',
    description: '初步诊断与体格检查结果存在逻辑不一致，如诊断"肺炎"但肺部听诊未记录异常。',
    location: '诊断与体格检查',
    suggestion:
      '请核对诊断依据，确保诊断与症状、体征、辅助检查一致。如诊断肺炎，应在体格检查中记录肺部啰音等阳性体征。',
    scoreDeduction: 3,
    ruleRef: '临床诊断思维规范',
  },
  {
    issueId: 'QC-007',
    severity: '提示',
    checkType: 'timeliness',
    ruleName: '首次病程记录超时',
    description: '首次病程记录未在患者入院后8小时内完成，存在书写时限风险。',
    location: '病程记录-首次病程',
    suggestion: '首次病程记录应在入院后8小时内完成，请及时补记并注明实际书写时间。',
    scoreDeduction: 3,
    ruleRef: '《医疗质量安全核心制度》三级查房制度',
  },
  {
    issueId: 'QC-008',
    severity: '提示',
    checkType: 'standardness',
    ruleName: '缺少医师签名',
    description: '病历末尾缺少执业医师签名或签名不清晰。',
    location: '文档末尾',
    suggestion: '请在病历末尾签署医师全名，确保签名清晰可辨。',
    scoreDeduction: 2,
    ruleRef: '《病历书写基本规范》第八条',
  },
];

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 病历质量检查
 *
 * 对病历文书进行多维度质量检查，返回质控得分和缺陷列表。
 *
 * @param input - 包含recordId或recordContent
 * @param context - 工具执行上下文
 * @returns 质控结果
 */
async function executeMedicalRecordQa(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = MedicalRecordQaInput.parse(input);

  if (!parsed.recordId && !parsed.recordContent) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '必须提供recordId或recordContent之一',
      },
    };
  }

  // 根据检查类型筛选问题
  const activeCheckTypes = new Set(parsed.checkTypes);
  const issues = MOCK_QC_ISSUES.filter((issue) => activeCheckTypes.has(issue.checkType as never));

  // 计算得分
  const totalDeduction = issues.reduce((sum, i) => sum + i.scoreDeduction, 0);
  const qcScore = Math.max(0, 100 - totalDeduction);

  const severeCount = issues.filter((i) => i.severity === '严重').length;
  const normalCount = issues.filter((i) => i.severity === '一般').length;
  const infoCount = issues.filter((i) => i.severity === '提示').length;

  return {
    success: true,
    data: {
      success: true,
      qcScore,
      issues,
      summary: {
        totalIssues: issues.length,
        severeCount,
        normalCount,
        infoCount,
      },
      checkedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const medicalRecordQaTool = buildMedicalTool({
  name: 'medical_record_qa',
  description:
    '对病历文书进行质量检查，包括完整性校验、书写规范性、逻辑一致性、时限合规性。返回质控得分（百分制）、缺陷列表（含严重程度、修改建议、规则依据）和问题汇总。',
  category: MedicalToolCategory.EMR,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['qc:execute'],
  inputSchema: MedicalRecordQaInput,
  outputSchema: MedicalRecordQaOutput,
  execute: executeMedicalRecordQa,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '病历质控',
  getActivityDescription: (input: unknown) => {
    const parsed = MedicalRecordQaInput.safeParse(input);
    if (parsed.success && parsed.data.recordId) {
      return `病历质控: ${parsed.data.recordId}`;
    }
    return '病历质控';
  },
});

export type MedicalRecordQaInputType = z.infer<typeof MedicalRecordQaInput>;
export type MedicalRecordQaOutputType = z.infer<typeof MedicalRecordQaOutput>;
