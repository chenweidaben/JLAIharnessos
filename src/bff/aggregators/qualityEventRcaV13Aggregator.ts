/**
 * 健澜科技 jlmedaios - 不良事件根因分析 RCA 辅助 V13 纯函数（M311-C）
 *
 * buildFiveWhyTemplateV13 / clusterSimilarEventsV13 / trackImprovementMeasureV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质量事件 */
export interface QualityEventV13 {
  id: string;
  eventType: string;
  description: string;
}

/** 5Why 模板 */
export interface FiveWhyTemplateV13 {
  eventId: string;
  description: string;
  why: string[];
}

/** 改进措施 */
export interface ImprovementMeasureV13 {
  eventId: string;
  measure: string;
  status: "open" | "verified" | "closed";
}

/**
 * 5Why 模板（纯函数）：事件描述 + 5 层 why 空模板。
 *
 * @param event 事件
 * @returns 5Why 模板
 */
export function buildFiveWhyTemplateV13(event: QualityEventV13): FiveWhyTemplateV13 {
  return {
    eventId: event.id,
    description: event.description,
    why: ["", "", "", "", ""],
  };
}

/**
 * 同类事件聚类（纯函数）：按 eventType 过滤。
 *
 * @param events 事件列表
 * @param eventType 类型
 * @returns 同类事件
 */
export function clusterSimilarEventsV13(
  events: QualityEventV13[],
  eventType: string,
): QualityEventV13[] {
  return events.filter((e) => e.eventType === eventType);
}

/**
 * 改进措施跟踪（纯函数）：返回带 status 的措施。
 *
 * @param event 事件
 * @param measure 措施
 * @param status 状态
 * @returns 改进措施
 */
export function trackImprovementMeasureV13(
  event: QualityEventV13,
  measure: string,
  status: "open" | "verified" | "closed",
): ImprovementMeasureV13 {
  return { eventId: event.id, measure, status };
}
