/**
 * Supervisor 编排分诊实现（契约 §0 supervisor.ts / §5）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 纯函数分诊：按意图把会话路由到下一个角色；急症已由编排层安全旁路，
 * 不进入本模块。用药问题 -> 药师；慢病管理 / 补充回答 / 信息充分的症状主诉
 * -> 医师；信息不足 / 文档上传 -> 追问角色；问候与退出不切换角色。
 */

import type { ConsultMessage, IntentKind, RoleKind } from './types';

/** 分诊上下文：意图 + 用户文本 + 历史消息 */
export interface TriageContext {
  intent: IntentKind;
  text: string;
  history: ConsultMessage[];
}

/** 症状充分性判定：含病程时长词或文本描述达到一定长度，视为可进入医师角色 */
const DURATION_PATTERN = /(天|周|月|年|小时|分钟|日)/;

/** 判断症状描述信息是否充分（确定性规则，可测可枚举） */
export function isSufficientForDoctor(text: string): boolean {
  const normalized = text.trim();
  if (normalized.length >= 12) {
    return true;
  }
  return normalized.length >= 8 && DURATION_PATTERN.test(normalized);
}

/**
 * 按意图与文本充分性选择下一角色
 *
 * @returns 下一角色标识；null 表示停留在分诊主管或直接结束本轮
 */
export function routeNextRole(context: TriageContext): RoleKind | null {
  switch (context.intent) {
    case 'medication_question':
      return 'pharmacist';
    case 'chronic_management':
      return 'doctor';
    case 'clarification_answer':
      return 'doctor';
    case 'symptom_report':
      return isSufficientForDoctor(context.text) ? 'doctor' : 'examiner';
    case 'document_upload':
      return 'examiner';
    case 'unknown':
      return 'examiner';
    case 'greeting':
    case 'acute_emergency':
    case 'exit':
    default:
      return null;
  }
}
