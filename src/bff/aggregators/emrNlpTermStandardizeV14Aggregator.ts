/**
 * 健澜科技 jlmedaios - 病历 NLP 术语标准化 V14 聚合器（M531-B）
 *
 * 纯函数：构建术语标准化基础数据 + 术语标准化 + 构建标准化报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 术语标准化基础数据 */
export interface NlpTermStandardizeV14 {
  termDomain: string;
  source: string;
}

/** 术语标准化输入 */
export interface NlpTermStandardizeInputV14 {
  rawTerm: string;
  aliases: Record<string, string>;
}

/** 术语标准化结果 */
export interface NlpTermStandardizeResultV14 {
  standardTerm: string;
  isAbbreviated: boolean;
}

/** 术语标准化报告 */
export interface NlpTermStandardizeReportV14 {
  standardTerm: string;
  isAbbreviated: boolean;
}

/**
 * 构建术语标准化基础数据。
 *
 * @param termDomain 术语域
 * @param source 数据源
 * @returns 术语标准化基础数据
 */
export function buildNlpTermStandardize(termDomain: string, source: string): NlpTermStandardizeV14 {
  return { termDomain, source };
}

/**
 * 术语标准化。
 * standardTerm = aliases[rawTerm] || rawTerm；isAbbreviated = standardTerm !== rawTerm。
 *
 * @param input 标准化输入（原始术语 + 别名映射）
 * @returns 标准化结果（standardTerm + isAbbreviated）
 */
export function standardizeMedicalTerm(input: NlpTermStandardizeInputV14): NlpTermStandardizeResultV14 {
  // 手算：standardTerm = aliases[rawTerm] || rawTerm
  // 测试2：aliases['APC'] = '阿司匹林' → standardTerm='阿司匹林'
  // 测试3：aliases['布洛芬'] = undefined → standardTerm='布洛芬'
  const standardTerm = input.aliases[input.rawTerm] || input.rawTerm;
  // 手算：isAbbreviated = standardTerm !== rawTerm
  // 测试2：'阿司匹林' !== 'APC' → isAbbreviated=true
  // 测试3：'布洛芬' !== '布洛芬' = false
  const isAbbreviated = standardTerm !== input.rawTerm;
  return { standardTerm, isAbbreviated };
}

/**
 * 构建标准化报告。
 *
 * @param result 标准化结果
 * @returns 标准化报告（standardTerm + isAbbreviated 透传）
 */
export function buildNlpTermStandardizeReport(result: NlpTermStandardizeResultV14): NlpTermStandardizeReportV14 {
  // 手算：透传 standardTerm + isAbbreviated
  // 测试4：{standardTerm:'阿司匹林', isAbbreviated:true} → standardTerm='阿司匹林', isAbbreviated=true
  return { standardTerm: result.standardTerm, isAbbreviated: result.isAbbreviated };
}
