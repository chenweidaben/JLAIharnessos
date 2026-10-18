/**
 * 健澜科技 jlmedaios - 病历关键事件时间线 V14 聚合器（M538-C）
 *
 * 纯函数：构建事件时间线基础数据 + 事件列表构建 + 构建事件报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 事件时间线基础数据 */
export interface EventTimelineV14 {
  recordId: string;
  patientName: string;
}

/** 事件项 */
export interface TimelineEventItemV14 {
  day: number;
  title: string;
}

/** 事件列表构建输入 */
export interface EventTimelineInputV14 {
  events: TimelineEventItemV14[];
}

/** 事件列表构建结果 */
export interface EventTimelineResultV14 {
  eventCount: number;
  firstEvent: string;
}

/** 事件报告 */
export interface EventTimelineReportV14 {
  eventCount: number;
  firstEvent: string;
}

/**
 * 构建事件时间线基础数据。
 *
 * @param recordId 病历ID
 * @param patientName 患者姓名
 * @returns 事件时间线基础数据
 */
export function buildEventTimeline(recordId: string, patientName: string): EventTimelineV14 {
  return { recordId, patientName };
}

/**
 * 事件列表构建。
 * eventCount = events.length
 * firstEvent = events.length > 0 ? events[0].title : '无事件'
 *
 * @param input 构建输入（事件列表）
 * @returns 构建结果（eventCount + firstEvent）
 */
export function buildEventTimelineList(input: EventTimelineInputV14): EventTimelineResultV14 {
  // 手算：eventCount = events.length
  // 测试2：events=[入院,手术,出院] → eventCount=3
  // 测试3：events=[] → eventCount=0
  const eventCount = input.events.length;
  // 手算：firstEvent = events.length > 0 ? events[0].title : '无事件'
  // 测试2：events[0].title='入院' → firstEvent='入院'
  // 测试3：events=[] → firstEvent='无事件'
  const firstEvent = input.events.length > 0 ? input.events[0]?.title ?? "无事件" : "无事件";
  return { eventCount, firstEvent };
}

/**
 * 构建事件报告。
 *
 * @param result 构建结果
 * @returns 事件报告（eventCount + firstEvent 透传）
 */
export function buildEventTimelineReport(result: EventTimelineResultV14): EventTimelineReportV14 {
  // 手算：透传 eventCount + firstEvent
  // 测试4：{eventCount=3, firstEvent='入院'} → eventCount=3, firstEvent='入院'
  return { eventCount: result.eventCount, firstEvent: result.firstEvent };
}
