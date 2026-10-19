/**
 * 健澜科技 jlmedaios - 病历AI手术编码推荐 V14 聚合器（M551-C）
 *
 * 纯函数：构建 AI 手术编码推荐基础数据 + AI 手术编码推荐 + 构建手术编码推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 手术编码推荐基础数据 */
export interface AiSurgeryCodeRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 手术编码推荐输入 */
export interface AiSurgeryCodeRecoInputV14 {
  surgeryName: string;
}

/** AI 手术编码推荐结果 */
export interface AiSurgeryCodeRecoResultV14 {
  icd9Code: string;
  confidence: number;
}

/** 手术编码推荐报告 */
export interface AiSurgeryCodeRecoReportV14 {
  icd9Code: string;
  confidence: number;
}

/**
 * 构建 AI 手术编码推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 手术编码推荐基础数据
 */
export function buildAiSurgeryCodeReco(recordId: string, dept: string): AiSurgeryCodeRecoV14 {
  return { recordId, dept };
}

/**
 * AI 手术编码推荐。
 * icd9Code = surgeryName.includes('搭桥') ? '36.10' : surgeryName.includes('支架') ? '36.06' : '00.00'
 * confidence = icd9Code === '00.00' ? 0.5 : 0.90
 *
 * @param input 手术编码推荐输入（手术名称）
 * @returns 手术编码推荐结果（icd9Code + confidence）
 */
export function recommendSurgeryCodeByAi(input: AiSurgeryCodeRecoInputV14): AiSurgeryCodeRecoResultV14 {
  // 手算：icd9Code = surgeryName.includes('搭桥') ? '36.10' : surgeryName.includes('支架') ? '36.06' : '00.00'
  // 测试2：surgeryName='冠状动脉搭桥术' → includes('搭桥')=true → icd9Code='36.10'
  // 测试3：surgeryName='清创缝合术' → 不含搭桥/支架 → icd9Code='00.00'
  const icd9Code = input.surgeryName.includes("搭桥") ? "36.10" : input.surgeryName.includes("支架") ? "36.06" : "00.00";
  // 手算：confidence = icd9Code === '00.00' ? 0.5 : 0.90
  // 测试2：icd9Code='36.10' !== '00.00' → confidence=0.90
  // 测试3：icd9Code='00.00' → confidence=0.5
  const confidence = icd9Code === "00.00" ? 0.5 : 0.90;
  return { icd9Code, confidence };
}

/**
 * 构建手术编码推荐报告。
 *
 * @param result 手术编码推荐结果
 * @returns 手术编码推荐报告（icd9Code + confidence 透传）
 */
export function buildAiSurgeryCodeRecoReport(result: AiSurgeryCodeRecoResultV14): AiSurgeryCodeRecoReportV14 {
  // 手算：透传 icd9Code + confidence
  // 测试4：{icd9Code='36.10', confidence=0.90} → 透传
  return { icd9Code: result.icd9Code, confidence: result.confidence };
}
