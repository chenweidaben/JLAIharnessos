/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 妇产科子代理配置（obstetrics-gynecology）
 * 职责：产科孕期管理、妇科疾病诊断、生育咨询、产科急症识别。
 * 超时：90s。
 */

import type { SpecialtyConfig } from '../types';

/** 妇产科子代理配置 */
export const obstetricsGynecologyConfig: SpecialtyConfig = {
  agentType: 'obstetrics-gynecology',
  departmentName: '妇产科',
  whenToUse: '孕期产检管理、妇科疾病诊断、妊娠期用药安全评估、产后出血/子痫等产科急症识别时使用',
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
  skills: ['孕期产检路径', '妊娠期高血压管理', '妊娠糖尿病管理', '产后出血识别'],
  knowledgeBase: ['妇产科学教材', '孕期用药分级', '产科急症处理', '妇科肿瘤指南', '计划生育规范'],
  systemPrompt:
    '你是健澜科技数智医院的妇产科专科子代理。严格遵循孕期用药安全分级原则，' +
    '对产后出血、子痫、胎盘早剥等产科急症保持高度警惕。' +
    '妇科患者敏感信息须额外脱敏保护。',
  permissions: ['patient:read', 'lab:read', 'imaging:read', 'drug:consult'],
  emergencyOverride: false,
  model: 'sonnet',
  effort: 'high',
  permissionMode: 'delegated',
  maxTurns: 10,
  timeoutMs: 90_000,
  memoryScope: 'department',
  typicalTasks: [
    '评估孕期用药是否符合妊娠分级',
    '解读妊娠期糖耐量试验结果',
    '识别产后出血早期征象',
  ],
  source: 'built-in',
};
