/**
 * 健澜科技 jlmedaios - 病历质控数据导出中心 V14 聚合器（M472-D，M472 收官）
 *
 * 纯函数：创建导出任务 + 根据数据集返回导出列名。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 导出任务状态 */
export type ExportTaskStatusV14 = "pending" | "processing" | "completed";

/** 导出任务 */
export interface ExportTaskV14 {
  id: string;
  dataset: string;
  columns: string[];
  status: ExportTaskStatusV14;
}

/** 数据集 → 默认列映射 */
const DATASET_COLUMNS: Record<string, string[]> = {
  病历: ["病历号", "患者姓名", "科室", "诊断", "质控得分", "缺陷数"],
};

/**
 * 创建导出任务，初始状态为 pending。
 *
 * @param dataset 数据集名
 * @param columns 导出列名
 * @returns 导出任务
 */
export function buildExportTask(dataset: string, columns: string[]): ExportTaskV14 {
  return {
    id: `EXP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    dataset,
    columns,
    status: "pending",
  };
}

/**
 * 根据数据集返回导出列名。
 *
 * @param dataset 数据集名
 * @returns 列名数组（未知数据集返回空数组）
 */
export function computeExportColumns(dataset: string): string[] {
  return DATASET_COLUMNS[dataset] ?? [];
}
