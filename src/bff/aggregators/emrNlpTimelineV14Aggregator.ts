/**
 * 健澜科技 jlmedaios - NLP 病历时间线构建 V14 聚合器（M490-D，M490 收官）
 *
 * 纯函数：病历时间线构建 + 时间线事件聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 时间线事件 */
export interface TimelineEventV14 {
  date: string;
  event: string;
}

/** 时间线结果 */
export interface NlpTimelineResultV14 {
  patientId: string;
  events: TimelineEventV14[];
}

/**
 * 构建病历时间线。
 *
 * @param patientId 患者ID
 * @param events 事件列表
 * @returns 时间线结果
 */
export function buildMedicalTimeline(patientId: string, events: TimelineEventV14[]): NlpTimelineResultV14 {
  return { patientId, events };
}

/**
 * 聚合时间线事件（总数+最早日期+最晚日期）。
 *
 * @param events 事件列表
 * @returns 聚合结果
 */
export function aggregateTimelineEvents(events: TimelineEventV14[]): { count: number; earliest: string; latest: string } {
  const count = events.length;
  if (count === 0) {
    return { count: 0, earliest: "", latest: "" };
  }
  // 手算：按日期升序排序后，第一个是 earliest，最后一个是 latest
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const earliest = sorted[0].date;
  const latest = sorted[sorted.length - 1].date;
  return { count, earliest, latest };
}
