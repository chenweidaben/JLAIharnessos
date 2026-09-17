/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 手术室子代理配置（operating-room）
 * 职责：手术安全核查、麻醉管理辅助、器械清点、术中事件记录、术后交接。
 * 超时：45s。
 */

import type { SpecialtyConfig } from '../types';

/** 手术室子代理配置 */
export const operatingRoomConfig: SpecialtyConfig = {
  agentType: 'operating-room',
  departmentName: '手术室',
  whenToUse:
    '手术安全核查（麻醉前/切皮前/离室前三阶段）、麻醉管理辅助、术中事件记录、术后交接时使用',
  tools: [
    'query_patient',
    'get_patient_detail',
    'get_medical_record',
    'get_lab_result',
    'get_image_report',
    'get_order_list',
  ],
  disallowedTools: ['create_order'],
  skills: ['手术安全核查路径', '麻醉诱导管理', '术中低血压处理', '术后苏醒评估'],
  knowledgeBase: ['麻醉学', '手术安全规范', '术中并发症处理', '麻醉药物手册', '手术室感染控制'],
  systemPrompt:
    '你是健澜科技数智医院的手术室专科子代理。患者安全第一，' +
    '严格执行手术安全核查三阶段（麻醉前/切皮前/离室前），' +
    '术中事件须精确记录。麻醉建议须经麻醉医师确认。',
  permissions: ['patient:read', 'record:read', 'lab:read', 'order:read'],
  emergencyOverride: false,
  model: 'sonnet',
  effort: 'high',
  permissionMode: 'delegated',
  maxTurns: 8,
  timeoutMs: 45_000,
  memoryScope: 'department',
  typicalTasks: [
    '执行手术安全核查清单并提示漏项',
    '记录术中低血压事件与处理',
    '生成术后交接单要点',
  ],
  source: 'built-in',
};
