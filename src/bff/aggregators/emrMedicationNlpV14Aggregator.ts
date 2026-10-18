/**
 * 健澜科技 jlmedaios - 病历用药自动提取 V14 聚合器（M529-D，M529 收官）
 *
 * 纯函数：构建用药提取基础数据 + 用药自动提取 + 构建提取报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 用药提取基础数据 */
export interface MedicationNlpV14 {
  recordId: string;
  dept: string;
}

/** 用药提取输入 */
export interface MedicationNlpInputV14 {
  rawText: string;
}

/** 用药提取结果 */
export interface MedicationNlpResultV14 {
  medList: string[];
  medCount: number;
  hasDose: boolean;
}

/** 用药提取报告 */
export interface MedicationNlpReportV14 {
  medCount: number;
  hasDose: boolean;
}

/**
 * 构建用药提取基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 用药提取基础数据
 */
export function buildMedicationNlp(recordId: string, dept: string): MedicationNlpV14 {
  return { recordId, dept };
}

/**
 * 用药自动提取。
 * 按分号分割 rawText 为数组，过滤空项；medCount = medList.length；
 * hasDose = medList.some(m => m.includes('mg') || m.includes('ml'))。
 *
 * @param input 提取输入（原始文本）
 * @returns 提取结果（medList + medCount + hasDose）
 */
export function extractMedicationStruct(input: MedicationNlpInputV14): MedicationNlpResultV14 {
  // 手算：按分号分割，过滤空项
  // 测试2：'阿司匹林100mg;美托洛尔25mg;阿托伐他汀20mg'.split(';') = ['阿司匹林100mg','美托洛尔25mg','阿托伐他汀20mg']
  // 测试3：'维生素C'.split(';') = ['维生素C']
  const medList = input.rawText.split(";").filter((s) => s !== "");
  // 手算：medCount = medList.length
  // 测试2：medCount=3
  // 测试3：medCount=1
  const medCount = medList.length;
  // 手算：hasDose = medList.some(m => m.includes('mg') || m.includes('ml'))
  // 测试2：3项都含'mg' → hasDose=true
  // 测试3：'维生素C'不含'mg'也不含'ml' → hasDose=false
  const hasDose = medList.some((m) => m.includes("mg") || m.includes("ml"));
  return { medList, medCount, hasDose };
}

/**
 * 构建提取报告。
 *
 * @param result 提取结果
 * @returns 提取报告（medCount + hasDose 透传）
 */
export function buildMedicationNlpReport(result: MedicationNlpResultV14): MedicationNlpReportV14 {
  // 手算：透传 medCount + hasDose
  // 测试4：{medCount:3, hasDose:true} → medCount=3, hasDose=true
  return { medCount: result.medCount, hasDose: result.hasDose };
}
