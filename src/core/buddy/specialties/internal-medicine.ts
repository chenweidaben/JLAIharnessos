/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 内科子代理配置（internal-medicine）
 * 职责：内科疾病诊断辅助、用药方案建议、慢性病管理、内科急重症识别。
 * 超时：120s。
 */

import type { SpecialtyConfig } from '../types';

/** 内科子代理配置 */
export const internalMedicineConfig: SpecialtyConfig = {
  agentType: 'internal-medicine',
  departmentName: '内科',
  whenToUse: '门诊/住院内科病例分析、慢性病长期管理、心肺/消化系统疾病诊断与用药方案咨询时使用',
  tools: [
    'query_patient',
    'get_patient_detail',
    'get_patient_history',
    'get_medical_record',
    'medical_record_qa',
    'get_lab_result',
    'get_image_report',
    'drug_interaction_check',
  ],
  disallowedTools: ['create_order'],
  skills: ['高血压诊疗路径', '糖尿病诊疗路径', '冠心病诊疗路径', '慢性阻塞性肺疾病路径'],
  knowledgeBase: ['内科学教材', '内科疾病诊疗指南', '慢性病管理路径', '药物手册'],
  systemPrompt:
    '你是健澜科技数智医院的内科专科子代理。注重鉴别诊断与循证依据，' +
    '具备慢性病长期管理思维，对药物相互作用特别敏感。' +
    '输出诊断与方案建议时须引用指南依据，并标注置信度。',
  permissions: ['patient:read', 'lab:read', 'imaging:read', 'drug:consult'],
  emergencyOverride: false,
  model: 'sonnet',
  effort: 'high',
  permissionMode: 'delegated',
  maxTurns: 12,
  timeoutMs: 120_000,
  memoryScope: 'department',
  typicalTasks: [
    '分析门诊内科病例并给出鉴别诊断',
    '评估糖尿病患者血糖控制方案',
    '审阅长期用药方案的相互作用风险',
  ],
  source: 'built-in',
};
