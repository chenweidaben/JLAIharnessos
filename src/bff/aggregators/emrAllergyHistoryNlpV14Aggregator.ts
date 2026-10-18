/**
 * 健澜科技 jlmedaios - 病历过敏史 NLP 提取 V14 聚合器（M530-B）
 *
 * 纯函数：构建过敏史提取基础数据 + 过敏史结构化提取 + 构建提取报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 过敏史提取基础数据 */
export interface AllergyHistoryNlpV14 {
  recordId: string;
  dept: string;
}

/** 过敏史提取输入 */
export interface AllergyHistoryNlpInputV14 {
  rawText: string;
}

/** 过敏史提取结果 */
export interface AllergyHistoryNlpResultV14 {
  allergyList: string[];
  allergyCount: number;
  hasPenicillin: boolean;
}

/** 过敏史提取报告 */
export interface AllergyHistoryNlpReportV14 {
  allergyCount: number;
  hasPenicillin: boolean;
}

/**
 * 构建过敏史提取基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 过敏史提取基础数据
 */
export function buildAllergyHistoryNlp(recordId: string, dept: string): AllergyHistoryNlpV14 {
  return { recordId, dept };
}

/**
 * 过敏史结构化提取。
 * 按英文逗号（,）分割 rawText 为数组，过滤空项；allergyCount = allergyList.length；
 * hasPenicillin = allergyList.some(a => a.includes('青霉素'))。
 *
 * @param input 提取输入（原始文本）
 * @returns 提取结果（allergyList + allergyCount + hasPenicillin）
 */
export function extractAllergyHistoryStruct(input: AllergyHistoryNlpInputV14): AllergyHistoryNlpResultV14 {
  // 手算：按英文逗号分割，过滤空项
  // 测试2：'青霉素,头孢,花粉'.split(',') = ['青霉素','头孢','花粉']
  // 测试3：'花粉,尘螨'.split(',') = ['花粉','尘螨']
  const allergyList = input.rawText.split(",").filter((s) => s !== "");
  // 手算：allergyCount = allergyList.length
  // 测试2：allergyCount=3
  // 测试3：allergyCount=2
  const allergyCount = allergyList.length;
  // 手算：hasPenicillin = allergyList.some(a => a.includes('青霉素'))
  // 测试2：'青霉素'含'青霉素' → hasPenicillin=true
  // 测试3：'花粉'/'尘螨'都不含'青霉素' → hasPenicillin=false
  const hasPenicillin = allergyList.some((a) => a.includes("青霉素"));
  return { allergyList, allergyCount, hasPenicillin };
}

/**
 * 构建提取报告。
 *
 * @param result 提取结果
 * @returns 提取报告（allergyCount + hasPenicillin 透传）
 */
export function buildAllergyHistoryNlpReport(result: AllergyHistoryNlpResultV14): AllergyHistoryNlpReportV14 {
  // 手算：透传 allergyCount + hasPenicillin
  // 测试4：{allergyCount:3, hasPenicillin:true} → allergyCount=3, hasPenicillin=true
  return { allergyCount: result.allergyCount, hasPenicillin: result.hasPenicillin };
}
