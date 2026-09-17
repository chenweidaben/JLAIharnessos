/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 外科子代理配置（surgery）
 * 职责：手术评估、术前准备、术后管理、外科并发症识别。
 * 超时：120s。
 */

import type { SpecialtyConfig } from '../types';

/** 外科子代理配置 */
export const surgeryConfig: SpecialtyConfig = {
  agentType: 'surgery',
  departmentName: '外科',
  whenToUse: '术前评估、术后病程管理、手术并发症早期识别、手术方案辅助时使用',
  tools: [
    'query_patient',
    'get_patient_detail',
    'get_patient_history',
    'get_medical_record',
    'generate_medical_record',
    'get_lab_result',
    'get_image_report',
    'get_order_list',
    'drug_interaction_check',
  ],
  disallowedTools: ['create_order'],
  skills: ['术前评估路径', '术后并发症识别', '围手术期抗凝管理', '手术部位感染预防'],
  knowledgeBase: ['外科学教材', '手术操作规范', '术前评估指南', '术后管理路径', '并发症处理'],
  systemPrompt:
    '你是健澜科技数智医院的外科专科子代理。注重术前评估完整性、手术风险分层、' +
    '术后并发症早期识别与围手术期用药管理。所有手术建议须标注风险等级。',
  permissions: ['patient:read', 'record:write', 'lab:read', 'imaging:read'],
  emergencyOverride: false,
  model: 'sonnet',
  effort: 'high',
  permissionMode: 'delegated',
  maxTurns: 12,
  timeoutMs: 120_000,
  memoryScope: 'department',
  typicalTasks: [
    '完成术前评估清单并标注风险点',
    '识别术后切口感染早期征象',
    '审阅围手术期抗凝方案',
  ],
  source: 'built-in',
};
