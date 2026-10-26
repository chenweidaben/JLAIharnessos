/**
 * 健澜AI原生医院操作系统OS - S-09 门诊智能体测试合成夹具
 *
 * 演示占位数据：患者标识使用 patient-demo-xxx，不含院方实名、真实密码与密钥。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FactSnapshot } from '@/security/ai/types.js';
import type { Citation } from '@/knowledge-platform/citation/citationProtocol.js';
import type { DialogueSegment, OutpatientWorkflowInput } from '@/bff/agents/outpatient/types.js';

/** 演示事实快照（离线合成，不接 HIS/EMR） */
export const demoFacts: FactSnapshot = {
  patientId: 'patient-demo-001',
  visitId: 'visit-demo-001',
  patientName: '演示患者',
  age: 45,
  gender: '男',
  diagnoses: [],
  medications: [],
  keyVitals: {},
};

/** 演示引用条目（S-12 协议口径） */
export const demoCitations: Citation[] = [
  {
    refId: '[1]',
    chunkId: 'chunk-demo-001',
    title: '门诊病历书写规范',
    sectionPath: '主诉与现病史',
    sourceName: '院内规范知识库',
    effectiveDate: '2026-01-01',
    quotedExcerpt: '主诉应简明扼要，现病史应围绕主诉展开。',
  },
];

/** 构造对话分段 */
export function dialogue(segments: Array<[DialogueSegment['speaker'], string, number]>): DialogueSegment[] {
  return segments.map(([speaker, text, order]) => ({ speaker, text, order }));
}

/** 构造工作流输入（默认医生角色 + 知情同意确认） */
export function buildWorkflowInput(overrides: Partial<OutpatientWorkflowInput> = {}): OutpatientWorkflowInput {
  return {
    traceId: 'trace-demo-001',
    agentId: 'medical-record-outpatient',
    agentVersion: '1.0.0',
    actor: { userId: 'doctor-demo-001', role: 'doctor', department: '内科' },
    patientId: 'patient-demo-001',
    visitId: 'visit-demo-001',
    encounterDate: '2026-10-26',
    department: '内科',
    dialogue: dialogue([
      ['patient', '头痛三天，昨天开始加重。', 1],
      ['doctor', '还有其他不适吗？', 2],
      ['patient', '没有了。', 3],
    ]),
    facts: demoFacts,
    ragEvidence: [],
    consentConfirmed: true,
    queryText: '头痛三天',
    ...overrides,
  };
}
