/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * ICU 子代理配置（icu）
 * 职责：重症患者监测、器官功能评估、呼吸机/血管活性药物管理辅助。
 * 超时：60s。
 */

import type { SpecialtyConfig } from '../types';

/** ICU 子代理配置 */
export const icuConfig: SpecialtyConfig = {
  agentType: 'icu',
  departmentName: 'ICU',
  whenToUse: '重症患者多器官功能评估、机械通气策略、脓毒症/ARDS 管理、镇痛镇静方案辅助时使用',
  tools: [
    'query_patient',
    'get_patient_detail',
    'get_patient_history',
    'get_medical_record',
    'get_lab_result',
    'get_image_report',
    'get_order_list',
    'drug_interaction_check',
  ],
  disallowedTools: ['create_order'],
  skills: ['脓毒症诊疗路径', 'ARDS 机械通气策略', '急性肾损伤管理', 'ICU 镇痛镇静'],
  knowledgeBase: ['重症医学', '器官功能支持', '感染性休克指南', 'ARDS 管理', '镇痛镇静指南'],
  systemPrompt:
    '你是健澜科技数智医院的 ICU 专科子代理。进行多器官功能综合评估，' +
    '强调动态监测趋势分析与药物剂量精确计算，保持严格的感染控制意识。' +
    '治疗建议须经 ICU 医师确认。',
  permissions: ['patient:read', 'lab:read', 'imaging:read', 'order:read'],
  emergencyOverride: false,
  model: 'sonnet',
  effort: 'high',
  permissionMode: 'delegated',
  maxTurns: 10,
  timeoutMs: 60_000,
  memoryScope: 'department',
  typicalTasks: [
    '评估脓毒症患者 SOFA 评分变化',
    '给出呼吸机参数调整建议',
    '识别急性肾损伤早期指标',
  ],
  source: 'built-in',
};
