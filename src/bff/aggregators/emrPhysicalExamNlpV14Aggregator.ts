/**
 * 健澜科技 jlmedaios - 病历体格检查 NLP 提取 V14 聚合器（M530-C）
 *
 * 纯函数：构建体格检查提取基础数据 + 体格检查结构化提取 + 构建提取报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 体格检查提取基础数据 */
export interface PhysicalExamNlpV14 {
  recordId: string;
  dept: string;
}

/** 体格检查提取输入 */
export interface PhysicalExamNlpInputV14 {
  rawText: string;
}

/** 体格检查提取结果 */
export interface PhysicalExamNlpResultV14 {
  vitalSigns: string[];
  hasAbnormal: boolean;
}

/** 体格检查提取报告 */
export interface PhysicalExamNlpReportV14 {
  vitalSignCount: number;
  hasAbnormal: boolean;
}

/**
 * 构建体格检查提取基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 体格检查提取基础数据
 */
export function buildPhysicalExamNlp(recordId: string, dept: string): PhysicalExamNlpV14 {
  return { recordId, dept };
}

/**
 * 体格检查结构化提取。
 * 按竖线（|）分割 rawText 为数组，过滤空项；hasAbnormal = vitalSigns.some(v => v.includes('异常') || v.includes('高') || v.includes('低'))。
 *
 * @param input 提取输入（原始文本）
 * @returns 提取结果（vitalSigns + hasAbnormal）
 */
export function extractPhysicalExamStruct(input: PhysicalExamNlpInputV14): PhysicalExamNlpResultV14 {
  // 手算：按竖线分割，过滤空项
  // 测试2：'体温36.5℃|血压偏高|心率80次/分'.split('|') = ['体温36.5℃','血压偏高','心率80次/分']
  // 测试3：'体温36.5℃|心率72次/分'.split('|') = ['体温36.5℃','心率72次/分']
  const vitalSigns = input.rawText.split("|").filter((s) => s !== "");
  // 手算：hasAbnormal = vitalSigns.some(v => v.includes('异常') || v.includes('高') || v.includes('低'))
  // 测试2：'血压偏高'.includes('高') = true → hasAbnormal=true
  // 测试3：'体温36.5℃'/'心率72次/分'都不含 异常/高/低 → hasAbnormal=false
  const hasAbnormal = vitalSigns.some((v) => v.includes("异常") || v.includes("高") || v.includes("低"));
  return { vitalSigns, hasAbnormal };
}

/**
 * 构建提取报告。
 *
 * @param result 提取报告输入（vitalSignCount + hasAbnormal）
 * @returns 提取报告（vitalSignCount + hasAbnormal 透传）
 */
export function buildPhysicalExamNlpReport(result: { vitalSignCount: number; hasAbnormal: boolean }): PhysicalExamNlpReportV14 {
  // 手算：透传 vitalSignCount + hasAbnormal
  // 测试4：{vitalSignCount:3, hasAbnormal:true} → vitalSignCount=3, hasAbnormal=true
  return { vitalSignCount: result.vitalSignCount, hasAbnormal: result.hasAbnormal };
}
