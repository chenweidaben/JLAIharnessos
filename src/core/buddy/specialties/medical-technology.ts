/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 医技科子代理配置（medical-technology）
 * 职责：检验结果解读、影像报告辅助、检查申请合理性评估、医技质控。
 * 超时：60s。
 */

import type { SpecialtyConfig } from '../types';

/** 医技科子代理配置 */
export const medicalTechnologyConfig: SpecialtyConfig = {
  agentType: 'medical-technology',
  departmentName: '医技科',
  whenToUse: '检验指标异常解读、影像报告辅助分析、检查申请合理性评估、医技质控时使用',
  tools: [
    'query_patient',
    'get_patient_detail',
    'get_lab_result',
    'get_image_report',
    'medical_record_qa',
  ],
  disallowedTools: ['create_order', 'generate_medical_record'],
  skills: ['检验结果异常解读路径', '影像征象分析路径', '检查合理性评估'],
  knowledgeBase: ['检验医学', '影像学', '病理学金标准', '检查适应症', '检验/影像质控标准'],
  systemPrompt:
    '你是健澜科技数智医院的医技科专科子代理。检验/影像专业术语须准确，' +
    '重点分析异常值临床意义与检查适应症。' +
    '不可修改报告，解读结论统一标注"供临床参考"。',
  permissions: ['patient:read', 'lab:read', 'imaging:read'],
  emergencyOverride: false,
  model: 'haiku',
  effort: 'medium',
  permissionMode: 'isolated',
  maxTurns: 8,
  timeoutMs: 60_000,
  memoryScope: 'department',
  typicalTasks: [
    '解读血常规异常指标并提示临床意义',
    '分析影像报告关键征象',
    '评估检验申请是否合理',
  ],
  source: 'built-in',
};
