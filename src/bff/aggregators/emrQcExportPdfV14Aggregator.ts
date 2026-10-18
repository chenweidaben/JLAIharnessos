/**
 * 健澜科技 jlmedaios - 质控数据导出 PDF V14 聚合器（M497-B）
 *
 * 纯函数：PDF 导出配置构建 + PDF 页内容格式化。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** PDF 导出配置 */
export interface ExportPdfV14 {
  title: string;
  pageSize: string;
}

/**
 * 构建 PDF 导出配置。
 *
 * @param title 标题
 * @param pageSize 纸张大小（A4/A3/Letter）
 * @returns PDF 导出配置
 */
export function buildExportPdf(title: string, pageSize: string): ExportPdfV14 {
  return { title, pageSize };
}

/**
 * 格式化 PDF 页内容（标题+正文拼接）。
 *
 * @param title 标题
 * @param content 正文
 * @returns 格式化后的 PDF 页字符串
 */
export function formatPdfPage(title: string, content: string): string {
  // 手算格式化：标题+换行+正文拼接
  return `${title}\n${content}`;
}
