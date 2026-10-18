/**
 * 健澜科技 jlmedaios - 病历 NLP 否定检测 V14 聚合器（M531-D，M531 收官）
 *
 * 纯函数：构建否定检测基础数据 + 否定检测 + 构建检测报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 否定检测基础数据 */
export interface NlpNegationDetectV14 {
  recordId: string;
  dept: string;
}

/** 否定检测输入 */
export interface NlpNegationDetectInputV14 {
  sentence: string;
  target: string;
}

/** 否定检测结果 */
export interface NlpNegationDetectResultV14 {
  isNegated: boolean;
  scope: string;
}

/** 否定检测报告 */
export interface NlpNegationDetectReportV14 {
  isNegated: boolean;
  scope: string;
}

/**
 * 构建否定检测基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 否定检测基础数据
 */
export function buildNlpNegationDetect(recordId: string, dept: string): NlpNegationDetectV14 {
  return { recordId, dept };
}

/**
 * 否定检测。
 * isNegated = sentence.includes('无' + target) || sentence.includes('未见' + target) || sentence.includes('否认' + target)；
 * scope = isNegated ? '否定范围' : '肯定范围'。
 *
 * @param input 检测输入（句子 + 目标词）
 * @returns 检测结果（isNegated + scope）
 */
export function detectNegationScope(input: NlpNegationDetectInputV14): NlpNegationDetectResultV14 {
  // 手算：isNegated = sentence.includes('无'+target) || sentence.includes('未见'+target) || sentence.includes('否认'+target)
  // 测试2：sentence='患者无胸痛症状', target='胸痛' → sentence.includes('无胸痛') = true
  // 测试3：sentence='患者有咳嗽咳痰', target='咳嗽' → sentence.includes('无咳嗽')=false, includes('未见咳嗽')=false, includes('否认咳嗽')=false → isNegated=false
  const isNegated =
    input.sentence.includes("无" + input.target) ||
    input.sentence.includes("未见" + input.target) ||
    input.sentence.includes("否认" + input.target);
  // 手算：scope = isNegated ? '否定范围' : '肯定范围'
  // 测试2：isNegated=true → scope='否定范围'
  // 测试3：isNegated=false → scope='肯定范围'
  const scope = isNegated ? "否定范围" : "肯定范围";
  return { isNegated, scope };
}

/**
 * 构建检测报告。
 *
 * @param result 检测结果
 * @returns 检测报告（isNegated + scope 透传）
 */
export function buildNlpNegationDetectReport(result: NlpNegationDetectResultV14): NlpNegationDetectReportV14 {
  // 手算：透传 isNegated + scope
  // 测试4：{isNegated:true, scope:'否定范围'} → isNegated=true, scope='否定范围'
  return { isNegated: result.isNegated, scope: result.scope };
}
