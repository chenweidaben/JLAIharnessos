/**
 * 健澜科技 jlmedaios - 病历归档与封存管理 V14 聚合器（M462-B）
 *
 * 纯函数：出院满 7 天才可归档 + 归档天数计算（Math.ceil 向上取整天数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归档记录 */
export interface ArchiveRecordV14 {
  recordId: string;
  patientName: string;
  dischargedAt: string;
  sealed: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ARCHIVE_THRESHOLD_DAYS = 7;

/**
 * 判断是否可归档（出院满 7 天）。
 *
 * @param dischargedAt 出院时间（ISO）
 * @param now 当前时间（ISO）
 * @returns 是否可归档
 */
export function isArchivable(dischargedAt: string, now: string): boolean {
  const dischargedMs = new Date(dischargedAt).getTime();
  const nowMs = new Date(now).getTime();
  if (Number.isNaN(dischargedMs) || Number.isNaN(nowMs)) return false;
  const diffDays = (nowMs - dischargedMs) / DAY_MS;
  return diffDays >= ARCHIVE_THRESHOLD_DAYS;
}

/**
 * 计算出院到今天的天数（Math.ceil 向上取整天数）。
 *
 * @param dischargedAt 出院时间（ISO）
 * @param now 当前时间（ISO）
 * @returns 归档天数（向上取整）
 */
export function computeArchiveDays(dischargedAt: string, now: string): number {
  const dischargedMs = new Date(dischargedAt).getTime();
  const nowMs = new Date(now).getTime();
  if (Number.isNaN(dischargedMs) || Number.isNaN(nowMs)) return 0;
  const diffDays = (nowMs - dischargedMs) / DAY_MS;
  return Math.ceil(diffDays);
}
