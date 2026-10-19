/**
 * 健澜科技 jlmedaios - 病历AI肠内营养支持建议 V14 聚合器（M564-C）
 *
 * 纯函数：构建 AI 肠内营养支持建议基础数据 + AI 肠内营养支持建议 + 构建肠内营养支持建议报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 肠内营养支持建议基础数据 */
export interface AiEnteralNutritionSuggestV14 {
  recordId: string;
  dept: string;
}

/** AI 肠内营养支持建议输入 */
export interface AiEnteralNutritionSuggestInputV14 {
  swallowing: string;
  gutFunction: string;
}

/** AI 肠内营养支持建议结果 */
export interface AiEnteralNutritionSuggestResultV14 {
  formula: string;
  deliveryRoute: string;
}

/** 肠内营养支持建议报告 */
export interface AiEnteralNutritionSuggestReportV14 {
  formula: string;
  deliveryRoute: string;
}

/**
 * 构建 AI 肠内营养支持建议基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 肠内营养支持建议基础数据
 */
export function buildAiEnteralNutritionSuggest(recordId: string, dept: string): AiEnteralNutritionSuggestV14 {
  return { recordId, dept };
}

/**
 * AI 肠内营养支持建议。
 * formula = swallowing === '困难' ? '整蛋白型肠内营养剂'
 *   : gutFunction === '正常' ? '短肽型肠内营养剂' : '组件型肠内营养剂'
 * deliveryRoute = swallowing === '困难' ? '鼻胃管' : '口服'
 *
 * @param input 肠内营养支持建议输入（吞咽功能 + 肠道功能）
 * @returns 肠内营养支持建议结果（formula + deliveryRoute）
 */
export function suggestEnteralNutritionByAi(input: AiEnteralNutritionSuggestInputV14): AiEnteralNutritionSuggestResultV14 {
  // 手算：formula = swallowing === '困难' ? '整蛋白型肠内营养剂'
  //   : gutFunction === '正常' ? '短肽型肠内营养剂' : '组件型肠内营养剂'
  // 测试2：swallowing='困难' → '整蛋白型肠内营养剂'
  // 测试3：swallowing='正常'（非困难）；gutFunction='正常' → '短肽型肠内营养剂'
  const formula = input.swallowing === "困难"
    ? "整蛋白型肠内营养剂"
    : input.gutFunction === "正常"
      ? "短肽型肠内营养剂"
      : "组件型肠内营养剂";
  // 手算：deliveryRoute = swallowing === '困难' ? '鼻胃管' : '口服'
  // 测试2：swallowing='困难' → '鼻胃管'
  // 测试3：swallowing='正常' → '口服'
  const deliveryRoute = input.swallowing === "困难" ? "鼻胃管" : "口服";
  return { formula, deliveryRoute };
}

/**
 * 构建肠内营养支持建议报告。
 *
 * @param result 肠内营养支持建议结果
 * @returns 肠内营养支持建议报告（formula + deliveryRoute 透传）
 */
export function buildAiEnteralNutritionSuggestReport(result: AiEnteralNutritionSuggestResultV14): AiEnteralNutritionSuggestReportV14 {
  // 手算：透传 formula + deliveryRoute
  // 测试4：{formula='整蛋白型肠内营养剂', deliveryRoute='鼻胃管'} → 透传
  return { formula: result.formula, deliveryRoute: result.deliveryRoute };
}
