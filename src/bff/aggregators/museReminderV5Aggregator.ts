/**
 * 健澜科技 jlmedaios - MUSE 主动提醒引擎 V5 纯函数（M284-C）
 *
 * evaluateReminderV5 / scheduleReminderV5 / suppressDuplicateV5 / buildMuseReminderV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 提醒规则 */
export interface ReminderRule {
  id: string;
  role: string;
  triggerEvent: string;
  condition: string;
  channel: string;
  messageTemplate: string;
  muteWindowMinutes: number;
}

/** 触发事件 */
export interface TriggerEvent {
  userId: string;
  event: string;
  value: number;
}

/** 提醒日志 */
export interface ReminderLog {
  userId: string;
  ruleId: string;
  sentAt: number;
}

/**
 * 规则评估 V5（纯函数）：事件命中触发条件。
 *
 * @param event 事件
 * @param rule 规则
 * @returns 是否触发
 */
export function evaluateReminderV5(event: TriggerEvent, rule: ReminderRule): boolean {
  if (event.event !== rule.triggerEvent) return false;
  if (rule.condition === "high" && event.value >= 80) return true;
  if (rule.condition === "medium" && event.value >= 50) return true;
  if (rule.condition === "any") return true;
  return false;
}

/**
 * 提醒排程 V5（纯函数）：按渠道与静音窗口计算发送时间。
 *
 * @param rule 规则
 * @param now 当前时间戳
 * @returns 计划发送时间
 */
export function scheduleReminderV5(rule: ReminderRule, now: number): { sendAt: number; channel: string } {
  return { sendAt: now + rule.muteWindowMinutes * 60 * 1000, channel: rule.channel };
}

/**
 * 去重抑制 V5（纯函数）：同一用户同一规则在静音窗口内不重复。
 *
 * @param logs 日志
 * @param rule 规则
 * @param userId 用户
 * @param now 当前时间戳
 * @returns 是否应抑制
 */
export function suppressDuplicateV5(logs: ReminderLog[], rule: ReminderRule, userId: string, now: number): boolean {
  const cutoff = now - rule.muteWindowMinutes * 60 * 1000;
  return logs.some((log) => log.userId === userId && log.ruleId === rule.id && log.sentAt >= cutoff);
}

/** 提醒引擎看板输出 */
export interface MuseReminderV5Report {
  totalRules: number;
  totalLogs: number;
  suppressedCount: number;
}

/**
 * 构建提醒引擎看板（纯函数）。
 *
 * @param rules 规则列表
 * @param logs 日志
 * @returns 看板
 */
export function buildMuseReminderV5Report(rules: ReminderRule[], logs: ReminderLog[]): MuseReminderV5Report {
  return {
    totalRules: rules.length,
    totalLogs: logs.length,
    suppressedCount: logs.filter((l) => l.sentAt > 0).length,
  };
}
