/**
 * 健澜科技数智医院智能体 - DB 行值安全文本化工具
 *
 * 背景：postgres.js 查询返回 `Record<string, unknown>`，仓储层大量 `String(row.x)`
 * 会把非常规类型（对象/数组）静默转成 '[object Object]' 写入业务字段，
 * eslint @typescript-eslint/no-base-to-string 全仓近 1500 处告警即源于此。
 *
 * 约定：
 *  - string 原样返回；number/boolean/bigint 走 String()；
 *  - Date 保持与 String(date) 一致的旧行为（不改线上输出格式）；
 *  - null/undefined → ''；
 *  - 其它（对象/数组等脏数据）→ ''（拒绝 '[object Object]' 入库/出参）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 安全文本化：替代 String(unknown)，杜绝 '[object Object]' 泄漏。 */
export function toText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  if (v instanceof Date) return String(v);
  return '';
}

/** 安全文本化（可空版）：null/undefined 保持 null，其余同 toText。 */
export function toTextOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return toText(v);
}
