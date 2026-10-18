/**
 * 健澜科技 jlmedaios - 质控数据导出 Excel V14 聚合器（M497-A）
 *
 * 纯函数：Excel 导出配置构建 + Excel 行数据格式化。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** Excel 导出配置 */
export interface ExportExcelV14 {
  title: string;
  columns: string[];
}

/**
 * 构建 Excel 导出配置。
 *
 * @param title 标题
 * @param columns 列名数组
 * @returns Excel 导出配置
 */
export function buildExportExcel(title: string, columns: string[]): ExportExcelV14 {
  return { title, columns };
}

/**
 * 格式化 Excel 行数据（按 columns 顺序提取 row 字段）。
 *
 * @param row 行数据对象
 * @param columns 列名数组
 * @returns 格式化后的行数组
 */
export function formatExcelRow(row: Record<string, string>, columns: string[]): string[] {
  // 手算格式化：按 columns 顺序提取 row 字段，缺失列跳过（返回空字符串）
  return columns.map((col) => row[col] ?? "");
}
