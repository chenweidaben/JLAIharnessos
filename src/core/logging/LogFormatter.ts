/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { LogEntry, LogLevel } from './types';

/**
 * 日志格式化器（LogFormatter）
 *
 * 职责：
 * - 将 LogEntry 序列化为 JSON（用于文件 / 远程传输）
 * - 生成控制台彩色输出（ANSI 转义码，零依赖）
 * - 自动检测并脱敏敏感字段（身份证、手机号、姓名等）
 *
 * 符合《个人信息保护法》《数据安全法》对日志脱敏的要求。
 */

/** 需要脱敏的字段名（不区分大小写匹配） */
const SENSITIVE_KEYS = new Set([
  'idcard',
  'id_card',
  'idcardno',
  'id_card_no',
  'phone',
  'mobile',
  'telephone',
  'name',
  'patientname',
  'patient_name',
  'address',
  'homeaddress',
  'emergencycontact',
  'emergency_contact',
  'bankcard',
  'bank_card',
  'password',
  'apikey',
  'api_key',
  'token',
  'secret',
]);

/** 18 位身份证 / 15 位旧身份证 / 11 位手机号 的正则 */
const ID_CARD_RE = /\b\d{17}[\dXx]\b|\b\d{15}\b/g;
const PHONE_RE = /\b1[3-9]\d{9}\b/g;

/**
 * 对字符串做掩码：保留首尾各 N 位，中间用 * 替换
 */
function maskString(value: string, head = 3, tail = 4): string {
  if (value.length <= head + tail) return '*'.repeat(value.length);
  return `${value.slice(0, head)}${'*'.repeat(value.length - head - tail)}${value.slice(-tail)}`;
}

/**
 * 递归遍历对象，对敏感 key 与疑似身份证 / 手机号做脱敏
 */
export function desensitize<T>(input: T, depth = 0): T {
  if (depth > 6 || input === null || input === undefined) return input;
  if (typeof input === 'string') {
    return input
      .replace(ID_CARD_RE, (m) => maskString(m, 4, 4))
      .replace(PHONE_RE, (m) => maskString(m, 3, 4)) as T;
  }
  if (Array.isArray(input)) {
    return (input as unknown[]).map((item) => desensitize(item, depth + 1)) as unknown as T;
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        out[key] = typeof value === 'string' ? maskString(value) : '[REDACTED]';
      } else {
        out[key] = desensitize(value, depth + 1);
      }
    }
    return out as T;
  }
  return input;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: '\x1b[36m', // cyan
  INFO: '\x1b[32m', // green
  WARN: '\x1b[33m', // yellow
  ERROR: '\x1b[31m', // red
  CRITICAL: '\x1b[41;1m', // red bg
};
const RESET = '\x1b[0m';

/**
 * 将日志条目格式化为单行 JSON（用于文件 / 远程）
 */
export function formatJson(entry: LogEntry): string {
  return JSON.stringify(desensitize(entry));
}

/**
 * 将日志条目格式化为控制台彩色单行
 */
export function formatConsole(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toISOString();
  const color = LEVEL_COLORS[entry.level] ?? '';
  const level = entry.level.padEnd(8);
  const ctxParts: string[] = [];
  if (entry.context.requestId) ctxParts.push(`req=${entry.context.requestId}`);
  if (entry.context.sessionId) ctxParts.push(`ses=${entry.context.sessionId}`);
  if (entry.context.userId) ctxParts.push(`uid=${entry.context.userId}`);
  if (entry.context.patientId) ctxParts.push(`pt=${entry.context.patientId}`);
  const ctx = ctxParts.length ? ` [${ctxParts.join(' ')}]` : '';
  const extra = Object.keys(entry.fields).length
    ? ` ${JSON.stringify(desensitize(entry.fields))}`
    : '';
  return `${time} ${color}${level}${RESET} ${entry.logger ?? ''}${ctx} ${entry.message}${extra}`;
}
