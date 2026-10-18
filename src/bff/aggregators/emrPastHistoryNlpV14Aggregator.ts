/**
 * 健澜科技 jlmedaios - 病历既往史 NLP 提取 V14 聚合器（M530-A）
 *
 * 纯函数：构建既往史提取基础数据 + 既往史结构化提取 + 构建提取报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 既往史提取基础数据 */
export interface PastHistoryNlpV14 {
  recordId: string;
  dept: string;
}

/** 既往史提取输入 */
export interface PastHistoryNlpInputV14 {
  rawText: string;
}

/** 既往史提取结果 */
export interface PastHistoryNlpResultV14 {
  diseaseList: string[];
  diseaseCount: string;
  hasSurgery: boolean;
}

/** 既往史提取报告 */
export interface PastHistoryNlpReportV14 {
  diseaseCount: string;
  hasSurgery: boolean;
}

/**
 * 构建既往史提取基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 既往史提取基础数据
 */
export function buildPastHistoryNlp(recordId: string, dept: string): PastHistoryNlpV14 {
  return { recordId, dept };
}

/**
 * 既往史结构化提取。
 * 按中文分号（；）分割 rawText 为数组，过滤空项；diseaseCount = String(diseaseList.length)；
 * hasSurgery = diseaseList.some(d => d.includes('手术'))。
 *
 * @param input 提取输入（原始文本）
 * @returns 提取结果（diseaseList + diseaseCount + hasSurgery）
 */
export function extractPastHistoryStruct(input: PastHistoryNlpInputV14): PastHistoryNlpResultV14 {
  // 手算：按中文分号（；）分割，过滤空项
  // 测试2：'高血压；糖尿病；阑尾手术史'.split('；') = ['高血压','糖尿病','阑尾手术史']
  // 测试3：'高血压；糖尿病'.split('；') = ['高血压','糖尿病']
  const diseaseList = input.rawText.split("；").filter((s) => s !== "");
  // 手算：diseaseCount = String(diseaseList.length)
  // 测试2：diseaseCount='3'
  // 测试3：diseaseCount='2'
  const diseaseCount = String(diseaseList.length);
  // 手算：hasSurgery = diseaseList.some(d => d.includes('手术'))
  // 测试2：'阑尾手术史'含'手术' → hasSurgery=true
  // 测试3：'高血压'/'糖尿病'都不含'手术' → hasSurgery=false
  const hasSurgery = diseaseList.some((d) => d.includes("手术"));
  return { diseaseList, diseaseCount, hasSurgery };
}

/**
 * 构建提取报告。
 *
 * @param result 提取结果
 * @returns 提取报告（diseaseCount + hasSurgery 透传）
 */
export function buildPastHistoryNlpReport(result: PastHistoryNlpResultV14): PastHistoryNlpReportV14 {
  // 手算：透传 diseaseCount + hasSurgery
  // 测试4：{diseaseCount:'3', hasSurgery:true} → diseaseCount='3', hasSurgery=true
  return { diseaseCount: result.diseaseCount, hasSurgery: result.hasSurgery };
}
