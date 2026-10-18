/**
 * 健澜科技 jlmedaios - 病历时间线导出 V14 聚合器（M538-D）
 *
 * 纯函数：构建导出基础数据 + 时间线导出 + 构建导出报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 导出基础数据 */
export interface TimelineExportV14 {
  recordId: string;
  format: string;
}

/** 时间线导出输入 */
export interface TimelineExportInputV14 {
  recordId: string;
  eventCount: number;
  format: "PDF" | "Excel" | "JSON";
}

/** 时间线导出结果 */
export interface TimelineExportResultV14 {
  exported: boolean;
  fileSizeKB: number;
}

/** 导出报告 */
export interface TimelineExportReportV14 {
  exported: boolean;
  fileSizeKB: number;
}

/**
 * 构建导出基础数据。
 *
 * @param recordId 病历ID
 * @param format 导出格式
 * @returns 导出基础数据
 */
export function buildTimelineExport(recordId: string, format: string): TimelineExportV14 {
  return { recordId, format };
}

/**
 * 时间线导出。
 * exported = true
 * fileSizeKB = Math.ceil(eventCount * 2)
 *
 * @param input 导出输入（病历ID + 事件数 + 格式）
 * @returns 导出结果（exported + fileSizeKB）
 */
export function exportTimeline(input: TimelineExportInputV14): TimelineExportResultV14 {
  // 手算：exported = true
  // 测试2：recordId='REC503', eventCount=12, format='PDF' → exported=true
  // 测试3：recordId='REC504', eventCount=7, format='Excel' → exported=true
  const exported = true;
  // 手算：fileSizeKB = Math.ceil(eventCount * 2)
  // 测试2：eventCount=12 → Math.ceil(12*2)=Math.ceil(24)=24
  // 测试3：eventCount=7 → Math.ceil(7*2)=Math.ceil(14)=14
  const fileSizeKB = Math.ceil(input.eventCount * 2);
  return { exported, fileSizeKB };
}

/**
 * 构建导出报告。
 *
 * @param result 导出结果
 * @returns 导出报告（exported + fileSizeKB 透传）
 */
export function buildTimelineExportReport(result: TimelineExportResultV14): TimelineExportReportV14 {
  // 手算：透传 exported + fileSizeKB
  // 测试4：{exported=true, fileSizeKB=24} → exported=true, fileSizeKB=24
  return { exported: result.exported, fileSizeKB: result.fileSizeKB };
}
