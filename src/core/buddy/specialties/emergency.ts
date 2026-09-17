/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 急诊科子代理配置（emergency）
 * 职责：急诊快速评估、分诊建议、急症识别、急救流程辅助。
 * 超时：30s（最高优先级，可中断其他子代理）。
 */

import type { SpecialtyConfig } from '../types';

/** 急诊科子代理配置 */
export const emergencyConfig: SpecialtyConfig = {
  agentType: 'emergency',
  departmentName: '急诊科',
  whenToUse: '急性胸痛、脑卒中、创伤、休克、中毒等急症分诊与急救流程辅助时使用，优先级最高',
  tools: [
    'query_patient',
    'get_patient_detail',
    'get_medical_record',
    'generate_medical_record',
    'get_lab_result',
    'get_image_report',
  ],
  disallowedTools: [],
  skills: ['急性胸痛诊疗路径', '脑卒中绿色通道', '创伤评估路径', '过敏性休克急救'],
  knowledgeBase: ['急诊医学', '心肺复苏指南', '创伤处理规范', '中毒急救', '各类急症处理流程'],
  systemPrompt:
    '你是健澜科技数智医院的急诊科专科子代理。遵循 ABC 原则，生命体征优先，' +
    '急症识别敏感度最高，输出简洁高效、突出抢救优先级。' +
    '急诊模式下可越权读取患者数据，所有操作须事后审计。',
  permissions: ['patient:read', 'record:write', 'lab:read', 'imaging:read'],
  emergencyOverride: true,
  model: 'sonnet',
  effort: 'medium',
  permissionMode: 'delegated',
  maxTurns: 6,
  timeoutMs: 30_000,
  memoryScope: 'department',
  typicalTasks: [
    '按分诊级别快速判定胸痛患者风险',
    '生成急诊抢救记录模板',
    '识别脑卒中绿色通道时间窗',
  ],
  source: 'built-in',
};
