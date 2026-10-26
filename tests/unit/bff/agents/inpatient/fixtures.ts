/**
 * 健澜AI原生医院操作系统OS - S-10 住院智能体测试合成夹具
 *
 * 演示占位数据：患者标识使用 patient-demo-xxx，不含院方实名、真实密码与密钥。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FactSnapshot } from '@/security/ai/types.js';
import type { Citation } from '@/knowledge-platform/citation/citationProtocol.js';
import { buildInpatientDraft } from '@/bff/agents/inpatient/dischargeSchema.js';
import type { InpatientDraft, InpatientWorkflowInput } from '@/bff/agents/inpatient/types.js';

/** 演示事实快照（离线合成，不接 HIS/EMR） */
export const demoFacts: FactSnapshot = {
  patientId: 'patient-demo-001',
  visitId: 'visit-demo-001',
  patientName: '演示患者',
  age: 58,
  gender: '男',
  diagnoses: [],
  medications: [],
  keyVitals: {},
};

/** 演示引用条目（S-12 协议口径） */
export const demoCitations: Citation[] = [
  {
    refId: '[1]',
    chunkId: 'chunk-demo-inpatient-001',
    title: '住院病历书写规范',
    sectionPath: '日常病程记录章节要求',
    sourceName: '院内规范知识库',
    effectiveDate: '2026-01-01',
    quotedExcerpt: '病程记录应围绕病情变化、查体、辅助检查与诊疗调整连续记录。',
  },
];

/** 构造工作流输入（默认医生角色 + 知情同意确认） */
export function buildWorkflowInput(overrides: Partial<InpatientWorkflowInput> = {}): InpatientWorkflowInput {
  return {
    traceId: 'trace-demo-inpatient-001',
    agentId: 'medical-record-inpatient',
    agentVersion: '1.0.0',
    actor: { userId: 'doctor-demo-001', role: 'doctor', department: '内科' },
    patientId: 'patient-demo-001',
    visitId: 'visit-demo-001',
    department: '内科',
    documentType: 'daily-progress',
    admissionTime: '2026-10-25T09:00:00+08:00',
    currentTime: '2026-10-26T08:30:00+08:00',
    severityLevel: 'stable',
    lastProgressTime: '2026-10-25T17:30:00+08:00',
    chiefComplaint: '反复咳嗽咳痰 3 天，加重 1 天。',
    presentIllness: '患者 3 天前出现咳嗽咳痰，昨日起自觉症状加重，今日入院观察。',
    queryText: '依据入院资料与今日查房记录生成日常病程草稿。',
    facts: demoFacts,
    ragEvidence: demoCitations,
    consentConfirmed: true,
    ...overrides,
  };
}

/** 构造一份通过住院 Schema 的演示草稿 */
export function buildValidDraft(overrides: Partial<InpatientDraft> = {}): InpatientDraft {
  return buildInpatientDraft({
    documentType: 'daily-progress',
    title: '日常病程记录',
    chiefComplaint: '反复咳嗽咳痰 3 天，加重 1 天。',
    presentIllness: '患者 3 天前出现咳嗽咳痰，昨日起自觉症状加重，今日入院观察。',
    historyIllness: '既往体健。',
    physicalExam: '神清，呼吸平稳，双肺呼吸音粗。',
    auxiliaryExams: '血常规结果待回报。',
    orders: '暂予对症支持治疗。',
    nursingNotes: '护理记录平稳。',
    sections: {
      病情变化: '咳嗽咳痰较前略减轻。',
      查体: '神清，呼吸平稳，双肺呼吸音粗。',
      辅助检查: '血常规结果待回报。',
      诊疗调整: '维持当前观察方案。',
      下一步安排: '继续观察症状变化。',
    },
    diagnosis: [],
    suggestions: [],
    keyNodes: [
      { time: '2026-10-25T09:00:00+08:00', event: '办理入院，收入内科观察', source: 'admission-record' },
    ],
    treatmentPlanAdjustment: false,
    missingInfo: [],
    citations: demoCitations,
    ...overrides,
  });
}
