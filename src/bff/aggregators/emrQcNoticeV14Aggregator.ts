/**
 * 健澜科技 jlmedaios - 病历质控通知公告 V14 聚合器（M472-C）
 *
 * 纯函数：创建通知 + 按类型过滤。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 通知类型 */
export type NoticeTypeV14 = "announcement" | "warning" | "reminder";

/** 通知 */
export interface QcNoticeV14 {
  id: string;
  title: string;
  content: string;
  type: NoticeTypeV14;
  date: string;
}

/**
 * 创建通知公告，自动填充当前日期。
 *
 * @param title 标题
 * @param content 内容
 * @param type 类型（announcement/warning/reminder）
 * @returns 通知
 */
export function buildNotice(
  title: string,
  content: string,
  type: NoticeTypeV14,
): QcNoticeV14 {
  return {
    id: `NT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    content,
    type,
    date: new Date().toISOString().slice(0, 10),
  };
}

/**
 * 按类型过滤通知。
 *
 * @param notices 通知列表
 * @param type 目标类型（空字符串返回全部）
 * @returns 过滤后的通知
 */
export function filterNoticesByType(
  notices: QcNoticeV14[],
  type: string,
): QcNoticeV14[] {
  if (!type.trim()) return notices;
  return notices.filter((n) => n.type === type);
}
