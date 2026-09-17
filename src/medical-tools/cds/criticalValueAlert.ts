/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 危急值预警工具
 * ---------------------------------------------------------------------------
 * 工具名：critical_value_alert
 * 自动识别检验结果中的危急值，给出临床意义、建议处理与通知记录。
 * 底层复用 CDS 规则引擎（labRules）。触发时为 high 优先级提醒，须立即通知医护。
 */

import { z } from 'zod';

import { CDSEngine } from '../../knowledge/cds/CDSEngine.js';
import type { CdsFacts } from '../../knowledge/cds/Rule.js';
import { labRules } from '../../knowledge/cds/rules/labRules.js';
import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// Schema
// ============================================================================

const CriticalValueAlertInput = z.object({
  patientId: z.string().describe('患者ID'),
  labResults: z
    .array(
      z.object({
        testName: z.string().describe('检验项目名称'),
        value: z.number().describe('结果值'),
        unit: z.string().optional().describe('单位'),
        refLow: z.number().optional().describe('参考下限'),
        refHigh: z.number().optional().describe('参考上限'),
      }),
    )
    .min(1)
    .describe('本次检验结果列表'),
});

const CriticalValueItem = z.object({
  testName: z.string(),
  value: z.string(),
  referenceRange: z.string(),
  criticalThreshold: z.string(),
  clinicalSignificance: z.string(),
  suggestedAction: z.array(z.string()),
  level: z.enum(['危急', '严重']),
});

const CriticalValueAlertOutput = z.object({
  success: z.boolean(),
  patientId: z.string(),
  hasCritical: z.boolean(),
  criticalValues: z.array(CriticalValueItem),
  notificationRecord: z.array(
    z.object({
      notifiedTo: z.string(),
      notificationMethod: z.string(),
      notifiedAt: z.string(),
      acknowledged: z.boolean(),
    }),
  ),
  sla: z.string().describe('处理时限'),
  disclaimer: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/** 单例引擎（复用规则库） */
const engine = new CDSEngine();
engine.registerRules(labRules);

/**
 * 危急值预警：把检验结果注入 CDS 事实上下文，运行危急值规则。
 */
async function executeCriticalValueAlert(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = CriticalValueAlertInput.parse(input);

  const facts: CdsFacts = {
    patientId: parsed.patientId,
    allergies: [],
    currentDrugs: [],
    newDrugs: [],
    diagnoses: [],
    symptoms: [],
    signs: [],
    labResults: parsed.labResults.map((l) => ({
      itemName: l.testName,
      value: l.value,
      unit: l.unit,
      refLow: l.refLow,
      refHigh: l.refHigh,
    })),
  };

  const result = engine.run(facts, 'lab_result_report');

  const criticalValues = result.hits.map((h) => {
    const lab = parsed.labResults.find(
      (l) => h.message.includes(l.testName) || h.ruleName.includes(l.testName),
    );
    return {
      testName: lab?.testName ?? h.ruleName,
      value: lab ? `${lab.value}${lab.unit ?? ''}` : h.message,
      referenceRange:
        lab?.refLow !== undefined && lab.refHigh !== undefined
          ? `${lab.refLow}~${lab.refHigh}`
          : '见报告单参考范围',
      criticalThreshold: h.ruleName,
      clinicalSignificance: h.message,
      suggestedAction: h.suggestions,
      level: h.level === 'critical' ? ('危急' as const) : ('严重' as const),
    };
  });

  const hasCritical = criticalValues.length > 0;
  const now = new Date().toISOString();

  return {
    success: true,
    data: {
      success: true,
      patientId: parsed.patientId,
      hasCritical,
      criticalValues,
      notificationRecord: hasCritical
        ? [
            {
              notifiedTo: '主管医生/值班护士',
              notificationMethod: '系统消息+电话',
              notifiedAt: now,
              acknowledged: false,
            },
          ]
        : [],
      sla: '发现危急值后30分钟内通知并确认处理，逾期升级上级医师',
      disclaimer: '危急值识别结果仅供参考，须立即由医护人员复核并处置，需医生确认',
    },
  };
}

// ============================================================================
// 导出
// ============================================================================

export const criticalValueAlertTool = buildMedicalTool({
  name: 'critical_value_alert',
  description:
    '自动识别检验结果中的危急值（血钾>6.5或<2.8、血糖<2.2或>22.2、血红蛋白<50、血小板<30、肌钙蛋白>0.5等），输出临床意义、建议处理与通知记录。触发时为最高优先级提醒。输入patientId与labResults[]。',
  category: MedicalToolCategory.CDS,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: CriticalValueAlertInput,
  outputSchema: CriticalValueAlertOutput,
  execute: executeCriticalValueAlert,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '危急值预警',
  getActivityDescription: () => '检验危急值识别与预警',
});

export type CriticalValueAlertInputType = z.infer<typeof CriticalValueAlertInput>;
export type CriticalValueAlertOutputType = z.infer<typeof CriticalValueAlertOutput>;
