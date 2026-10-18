/**
 * 健澜科技 jlmedaios - 病历诊断自动提取 V14 聚合器（M529-C）
 *
 * 纯函数：构建诊断提取基础数据 + 诊断自动提取 + 构建提取报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 诊断提取基础数据 */
export interface DiagnosisNlpV14 {
  recordId: string;
  dept: string;
}

/** 诊断提取输入 */
export interface DiagnosisNlpInputV14 {
  rawText: string;
}

/** 诊断提取结果 */
export interface DiagnosisNlpResultV14 {
  diagnosisList: string[];
  diagnosisCount: number;
}

/** 诊断提取报告 */
export interface DiagnosisNlpReportV14 {
  diagnosisCount: number;
  topDiagnosis: string;
}

/**
 * 构建诊断提取基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 诊断提取基础数据
 */
export function buildDiagnosisNlp(recordId: string, dept: string): DiagnosisNlpV14 {
  return { recordId, dept };
}

/**
 * 诊断自动提取。
 * 按逗号分割 rawText 为数组，过滤空项；diagnosisCount = diagnosisList.length。
 *
 * @param input 提取输入（原始文本）
 * @returns 提取结果（diagnosisList + diagnosisCount）
 */
export function extractDiagnosisStruct(input: DiagnosisNlpInputV14): DiagnosisNlpResultV14 {
  // 手算：按逗号分割，过滤空项
  // 测试2：'冠心病,高血压,2型糖尿病'.split(',') = ['冠心病','高血压','2型糖尿病']
  // 测试3：'急性阑尾炎'.split(',') = ['急性阑尾炎']
  const diagnosisList = input.rawText.split(",").filter((s) => s !== "");
  // 手算：diagnosisCount = diagnosisList.length
  // 测试2：diagnosisCount=3
  // 测试3：diagnosisCount=1
  const diagnosisCount = diagnosisList.length;
  return { diagnosisList, diagnosisCount };
}

/**
 * 构建提取报告。
 *
 * @param result 提取报告输入（diagnosisCount + topDiagnosis）
 * @returns 提取报告（diagnosisCount + topDiagnosis 透传）
 */
export function buildDiagnosisNlpReport(result: { diagnosisCount: number; topDiagnosis: string }): DiagnosisNlpReportV14 {
  // 手算：透传 diagnosisCount + topDiagnosis
  // 测试4：{diagnosisCount:3, topDiagnosis:'冠心病'} → diagnosisCount=3, topDiagnosis='冠心病'
  return { diagnosisCount: result.diagnosisCount, topDiagnosis: result.topDiagnosis };
}
