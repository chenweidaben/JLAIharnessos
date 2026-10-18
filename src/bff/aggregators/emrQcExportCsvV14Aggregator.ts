/**
 * 健澜科技 jlmedaios - 质控数据导出 CSV V14 聚合器（M497-C）
 *
 * 纯函数：CSV 导出配置构建 + CSV 行数据格式化。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** CSV 导出配置 */
export interface ExportCsvV14 {
  filename: string;
  delimiter: string;
}

/**
 * 构建 CSV 导出配置。
 *
 * @param filename 文件名
 * @param delimiter 分隔符（逗号/分号/制表符）
 * @returns CSV 导出配置
 */
export function buildExportCsv(filename: string, delimiter: string): ExportCsvV14 {
  return { filename, delimiter };
}

/**
 * 格式化 CSV 行（用 delimiter 连接，末尾加换行）。
 *
 * @param row 行数据数组
 * @param delimiter 分隔符
 * @returns 格式化后的 CSV 行字符串
 */
export function formatCsvRow(row: string[], delimiter: string): string {
  // 手算格式化：用 delimiter 连接数组元素，末尾加 \n 换行
  return `${row.join(delimiter)}\n`;
}
