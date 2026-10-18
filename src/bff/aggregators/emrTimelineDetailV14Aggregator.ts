/**
 * 健澜科技 jlmedaios - 病历时间轴视图 V14 聚合器（M464-C）
 *
 * 纯函数：按时间升序排序 + 按日期分组。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 时间轴事件类型 */
export type TimelineEventTypeV14 = "admission" | "progress" | "order" | "lab" | "imaging" | "discharge";

/** 时间轴事件 */
export interface TimelineEventV14 {
  id: string;
  eventType: TimelineEventTypeV14;
  title: string;
  eventTime: string;
}

/** 按日期分组结果 */
export interface TimelineDayGroupV14 {
  day: string;
  events: TimelineEventV14[];
}

/**
 * 按事件时间升序排序。
 *
 * @param events 时间轴事件列表
 * @returns 排序后的事件列表
 */
export function buildTimeline(events: TimelineEventV14[]): TimelineEventV14[] {
  return [...events].sort((a, b) => a.eventTime.localeCompare(b.eventTime));
}

/**
 * 按日期（YYYY-MM-DD）分组，组内按时间升序。
 *
 * @param events 时间轴事件列表
 * @returns 按日分组的结果
 */
export function groupByDay(events: TimelineEventV14[]): TimelineDayGroupV14[] {
  const sorted = buildTimeline(events);
  const dayMap = new Map<string, TimelineEventV14[]>();
  for (const event of sorted) {
    const day = event.eventTime.slice(0, 10);
    const existing = dayMap.get(day) ?? [];
    existing.push(event);
    dayMap.set(day, existing);
  }
  return Array.from(dayMap.entries()).map(([day, evts]) => ({ day, events: evts }));
}
