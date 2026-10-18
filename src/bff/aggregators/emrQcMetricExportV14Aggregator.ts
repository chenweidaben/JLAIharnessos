/**
 * 健澜科技 jlmedaios - 质控指标导出 V14 聚合器（M484-D，M484 收官）
 *
 * 纯函数：导出任务构建 + CSV 内容生成。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 导出任务 */
export interface ExportTaskV14 {
  metricName: string;
  format: string;
}

/**
 * 构建导出任务。
 *
 * @param metricName 指标名
 * @param format 导出格式
 * @returns 导出任务
 */
export function buildExportTask(metricName: string, format: string): ExportTaskV14 {
  return { metricName, format };
}

/**
 * 生成 CSV 内容：第一行表头"科室,指标值"，后续每行"科室名,数值"，用 \n 连接。
 *
 * @param rows 数据行
 * @returns CSV 字符串
 */
export function generateCsvContent(rows: { dept: string; value: number }[]): string {
  const header = "科室,指标值";
  const dataLines = rows.map((r) => `${r.dept},${r.value}`);
  return [header, ...dataLines].join("\n");
}
