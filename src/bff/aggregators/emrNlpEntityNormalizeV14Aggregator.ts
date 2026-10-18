/**
 * 健澜科技 jlmedaios - 病历 NLP 实体归一化 V14 聚合器（M531-A）
 *
 * 纯函数：构建实体归一化基础数据 + 实体归一化 + 构建归一化报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 实体归一化基础数据 */
export interface NlpEntityNormalizeV14 {
  entityType: string;
  source: string;
}

/** 实体归一化输入 */
export interface NlpEntityNormalizeInputV14 {
  rawEntity: string;
  dictionary: Record<string, string>;
}

/** 实体归一化结果 */
export interface NlpEntityNormalizeResultV14 {
  normalizedCode: string;
  matched: boolean;
}

/** 实体归一化报告 */
export interface NlpEntityNormalizeReportV14 {
  matched: boolean;
  normalizedCode: string;
}

/**
 * 构建实体归一化基础数据。
 *
 * @param entityType 实体类型
 * @param source 数据源
 * @returns 实体归一化基础数据
 */
export function buildNlpEntityNormalize(entityType: string, source: string): NlpEntityNormalizeV14 {
  return { entityType, source };
}

/**
 * 实体归一化。
 * normalizedCode = dictionary[rawEntity] || 'UNKNOWN'；matched = normalizedCode !== 'UNKNOWN'。
 *
 * @param input 归一化输入（原始实体 + 字典映射）
 * @returns 归一化结果（normalizedCode + matched）
 */
export function normalizeEntityToCode(input: NlpEntityNormalizeInputV14): NlpEntityNormalizeResultV14 {
  // 手算：normalizedCode = dictionary[rawEntity] || 'UNKNOWN'
  // 测试2：dictionary['冠心病'] = 'I25.1' → normalizedCode='I25.1'
  // 测试3：dictionary['感冒'] = undefined → normalizedCode='UNKNOWN'
  const normalizedCode = input.dictionary[input.rawEntity] || "UNKNOWN";
  // 手算：matched = normalizedCode !== 'UNKNOWN'
  // 测试2：normalizedCode='I25.1' ≠ 'UNKNOWN' → matched=true
  // 测试3：normalizedCode='UNKNOWN' → matched=false
  const matched = normalizedCode !== "UNKNOWN";
  return { normalizedCode, matched };
}

/**
 * 构建归一化报告。
 *
 * @param result 归一化结果
 * @returns 归一化报告（matched + normalizedCode 透传）
 */
export function buildNlpEntityNormalizeReport(result: NlpEntityNormalizeResultV14): NlpEntityNormalizeReportV14 {
  // 手算：透传 matched + normalizedCode
  // 测试4：{matched:true, normalizedCode:'I25.1'} → matched=true, normalizedCode='I25.1'
  return { matched: result.matched, normalizedCode: result.normalizedCode };
}
