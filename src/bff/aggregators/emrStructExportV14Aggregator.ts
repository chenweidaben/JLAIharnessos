/**
 * 健澜科技 jlmedaios - 病历结构化数据导出 V14 聚合器（M532-B）
 *
 * 纯函数：构建导出基础数据 + 导出结构化数据 + 构建导出报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 导出基础数据 */
export interface StructExportV14 {
  recordType: string;
  format: string;
}

/** 导出输入 */
export interface StructExportInputV14 {
  recordCount: number;
  format: "JSON" | "CSV" | "Excel";
}

/** 导出结果 */
export interface StructExportResultV14 {
  exportedCount: number;
  fileSizeKB: number;
}

/** 导出报告 */
export interface StructExportReportV14 {
  exportedCount: number;
  fileSizeKB: number;
}

/**
 * 构建导出基础数据。
 *
 * @param recordType 病历类型
 * @param format 导出格式
 * @returns 导出基础数据
 */
export function buildStructExport(recordType: string, format: string): StructExportV14 {
  return { recordType, format };
}

/**
 * 导出结构化数据。
 * exportedCount = recordCount；fileSizeKB = Math.ceil(recordCount * 0.5)。
 *
 * @param input 导出输入（记录数 + 格式）
 * @returns 导出结果（exportedCount + fileSizeKB）
 */
export function exportStructData(input: StructExportInputV14): StructExportResultV14 {
  // 手算：exportedCount = recordCount
  // 测试2：recordCount=100 → exportedCount=100
  // 测试3：recordCount=250 → exportedCount=250
  const exportedCount = input.recordCount;
  // 手算：fileSizeKB = Math.ceil(recordCount * 0.5)
  // 测试2：Math.ceil(100*0.5) = Math.ceil(50) = 50
  // 测试3：Math.ceil(250*0.5) = Math.ceil(125) = 125
  const fileSizeKB = Math.ceil(input.recordCount * 0.5);
  return { exportedCount, fileSizeKB };
}

/**
 * 构建导出报告。
 *
 * @param result 导出结果
 * @returns 导出报告（exportedCount + fileSizeKB 透传）
 */
export function buildStructExportReport(result: StructExportResultV14): StructExportReportV14 {
  // 手算：透传 exportedCount + fileSizeKB
  // 测试4：{exportedCount:100, fileSizeKB:50} → exportedCount=100, fileSizeKB=50
  return { exportedCount: result.exportedCount, fileSizeKB: result.fileSizeKB };
}
