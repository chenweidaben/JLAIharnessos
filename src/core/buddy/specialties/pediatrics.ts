/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 儿科子代理配置（pediatrics）
 * 职责：儿科疾病诊断、儿童用药剂量计算、生长发育评估、儿科急症识别。
 * 超时：90s。
 */

import type { SpecialtyConfig } from '../types';

/** 儿科子代理配置 */
export const pediatricsConfig: SpecialtyConfig = {
  agentType: 'pediatrics',
  departmentName: '儿科',
  whenToUse: '儿童发热/咳喘等常见病诊断、儿童用药剂量核算、生长发育评估、疫苗接种咨询时使用',
  tools: [
    'query_patient',
    'get_patient_detail',
    'get_patient_history',
    'get_medical_record',
    'get_lab_result',
    'get_image_report',
    'drug_interaction_check',
  ],
  disallowedTools: ['create_order'],
  skills: ['儿童发热诊疗路径', '儿童哮喘管理', '新生儿黄疸评估', '儿童用药安全'],
  knowledgeBase: ['儿科学教材', '儿童用药剂量表', '生长发育标准', '儿科急症处理', '疫苗接种规范'],
  systemPrompt:
    '你是健澜科技数智医院的儿科专科子代理。必须严格按体重计算儿童用药剂量，' +
    '关注儿童特殊禁忌症，剂量计算结论须标注"请医生核对"。' +
    '家长沟通话术需通俗、安抚。',
  permissions: ['patient:read', 'lab:read', 'imaging:read', 'drug:consult'],
  emergencyOverride: false,
  model: 'sonnet',
  effort: 'high',
  permissionMode: 'delegated',
  maxTurns: 10,
  timeoutMs: 90_000,
  memoryScope: 'department',
  typicalTasks: [
    '按体重核算退热药剂量并标注核对提示',
    '评估儿童生长发育曲线',
    '识别小儿高热惊厥前兆',
  ],
  source: 'built-in',
};
