/**
 * 健澜科技 jlmedaios - 病历质控操作日志 V14 聚合器（M473-C）
 *
 * 纯函数：记录操作日志 + 按操作人/动作过滤（AND 逻辑）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 操作日志 */
export interface OpLogV14 {
  id: string;
  operator: string;
  action: string;
  target: string;
  timestamp: string;
}

/** 过滤条件 */
export interface OpLogFilterV14 {
  operator?: string;
  action?: string;
}

/**
 * 记录操作日志，自动加 timestamp（ISO 字符串）。
 *
 * @param operator 操作人
 * @param action 动作
 * @param target 目标
 * @returns 操作日志
 */
export function recordOpLog(operator: string, action: string, target: string): OpLogV14 {
  return {
    id: `LOG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    operator,
    action,
    target,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 按操作人/动作过滤日志（AND 逻辑，空条件不过滤）。
 *
 * @param logs 日志列表
 * @param filter 过滤条件
 * @returns 过滤后的日志
 */
export function filterOpLogs(logs: OpLogV14[], filter: OpLogFilterV14): OpLogV14[] {
  return logs.filter((log) => {
    if (filter.operator && log.operator !== filter.operator) return false;
    if (filter.action && log.action !== filter.action) return false;
    return true;
  });
}
