/**
 * 健澜科技 jlmedaios - 病历水印追踪 V14 聚合器（M528-C）
 *
 * 纯函数：构建水印追踪基础数据 + 水印应用 + 构建水印报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 水印追踪基础数据 */
export interface WatermarkTraceV14 {
  recordId: string;
  watermarkText: string;
}

/** 水印应用输入 */
export interface WatermarkApplyInputV14 {
  recordId: string;
  operator: string;
  watermarkText: string;
}

/** 水印应用结果 */
export interface WatermarkApplyResultV14 {
  watermarkId: string;
  traceable: boolean;
}

/** 水印报告 */
export interface WatermarkTraceReportV14 {
  watermarkId: string;
  traceable: boolean;
}

/**
 * 构建水印追踪基础数据。
 *
 * @param recordId 病历ID
 * @param watermarkText 水印文字
 * @returns 水印追踪基础数据
 */
export function buildWatermarkTrace(recordId: string, watermarkText: string): WatermarkTraceV14 {
  return { recordId, watermarkText };
}

/**
 * 水印应用。
 * watermarkId = 'WM-' + recordId；traceable = true（水印应用后即可追踪）。
 *
 * @param input 水印应用输入（病历ID + 操作人 + 水印文字）
 * @returns 应用结果（watermarkId + traceable）
 */
export function applyWatermark(input: WatermarkApplyInputV14): WatermarkApplyResultV14 {
  // 手算：watermarkId = 'WM-' + recordId
  // 测试2：recordId='REC052' → watermarkId='WM-REC052'
  // 测试3：recordId='REC053' → watermarkId='WM-REC053'
  const watermarkId = "WM-" + input.recordId;
  // 手算：traceable = true（水印应用后即可追踪）
  // 测试2/3：traceable=true
  const traceable = true;
  return { watermarkId, traceable };
}

/**
 * 构建水印报告。
 *
 * @param result 应用结果
 * @returns 水印报告（watermarkId + traceable 透传）
 */
export function buildWatermarkTraceReport(result: WatermarkApplyResultV14): WatermarkTraceReportV14 {
  // 手算：透传 watermarkId + traceable
  // 测试4：{watermarkId:'WM-REC052', traceable:true} → watermarkId='WM-REC052', traceable=true
  return { watermarkId: result.watermarkId, traceable: result.traceable };
}
