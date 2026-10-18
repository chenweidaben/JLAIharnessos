/**
 * 健澜科技 jlmedaios - 病历辅助检查 NLP 提取 V14 聚合器（M530-D，M530 收官）
 *
 * 纯函数：构建辅助检查提取基础数据 + 辅助检查结构化提取 + 构建提取报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 辅助检查提取基础数据 */
export interface LabExamNlpV14 {
  recordId: string;
  dept: string;
}

/** 辅助检查提取输入 */
export interface LabExamNlpInputV14 {
  rawText: string;
}

/** 辅助检查提取结果 */
export interface LabExamNlpResultV14 {
  examItems: string[];
  abnormalCount: number;
}

/** 辅助检查提取报告 */
export interface LabExamNlpReportV14 {
  abnormalCount: number;
  abnormalRate: number;
}

/**
 * 构建辅助检查提取基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 辅助检查提取基础数据
 */
export function buildLabExamNlp(recordId: string, dept: string): LabExamNlpV14 {
  return { recordId, dept };
}

/**
 * 辅助检查结构化提取。
 * 按换行符（\n）分割 rawText 为数组，过滤空项；abnormalCount = examItems.filter(i => i.includes('↑') || i.includes('↓')).length。
 *
 * @param input 提取输入（原始文本）
 * @returns 提取结果（examItems + abnormalCount）
 */
export function extractLabExamStruct(input: LabExamNlpInputV14): LabExamNlpResultV14 {
  // 手算：按换行符分割，过滤空项
  // 测试2：'白细胞 6.5\n血红蛋白 120↑\n血糖 5.6'.split('\n') = ['白细胞 6.5','血红蛋白 120↑','血糖 5.6']
  // 测试3：'白细胞 6.5\n血糖 5.6'.split('\n') = ['白细胞 6.5','血糖 5.6']
  const examItems = input.rawText.split("\n").filter((s) => s !== "");
  // 手算：abnormalCount = examItems.filter(i => i.includes('↑') || i.includes('↓')).length
  // 测试2：仅'血红蛋白 120↑'含↑ → abnormalCount=1
  // 测试3：'白细胞 6.5'/'血糖 5.6'都不含↑↓ → abnormalCount=0
  const abnormalCount = examItems.filter((i) => i.includes("↑") || i.includes("↓")).length;
  return { examItems, abnormalCount };
}

/**
 * 构建提取报告。
 * abnormalRate = examTotal > 0 ? Math.round(abnormalCount / examTotal * 1000) / 10 : 0（保留1位小数）。
 *
 * @param result 提取报告输入（abnormalCount + examTotal）
 * @returns 提取报告（abnormalCount + abnormalRate）
 */
export function buildLabExamNlpReport(result: { abnormalCount: number; examTotal: number }): LabExamNlpReportV14 {
  // 手算：abnormalRate = examTotal > 0 ? Math.round(abnormalCount / examTotal * 1000) / 10 : 0
  // 测试4：abnormalCount=1, examTotal=3 → 1/3*1000=333.333... → Math.round=333 → 333/10=33.3
  const abnormalRate = result.examTotal > 0 ? Math.round((result.abnormalCount / result.examTotal) * 1000) / 10 : 0;
  return { abnormalCount: result.abnormalCount, abnormalRate };
}
