/**
 * 健澜科技 jlmedaios - 病历AI膳食处方推荐 V14 聚合器（M564-B）
 *
 * 纯函数：构建 AI 膳食处方推荐基础数据 + AI 膳食处方推荐 + 构建膳食处方推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 膳食处方推荐基础数据 */
export interface AiDietScriptRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 膳食处方推荐输入 */
export interface AiDietScriptRecoInputV14 {
  disease: string;
  calorieNeeds: number;
}

/** AI 膳食处方推荐结果 */
export interface AiDietScriptRecoResultV14 {
  dietType: string;
  nutritionRatio: string;
}

/** 膳食处方推荐报告 */
export interface AiDietScriptRecoReportV14 {
  dietType: string;
  nutritionRatio: string;
}

/**
 * 构建 AI 膳食处方推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 膳食处方推荐基础数据
 */
export function buildAiDietScriptReco(recordId: string, dept: string): AiDietScriptRecoV14 {
  return { recordId, dept };
}

/**
 * AI 膳食处方推荐。
 * dietType = disease.includes('糖尿病') ? '糖尿病饮食'
 *   : disease.includes('肾病') ? '低蛋白饮食' : '普通均衡饮食'
 * nutritionRatio = calorieNeeds >= 2000 ? '高蛋白高热量' : '常规热量配比'
 *
 * @param input 膳食处方推荐输入（疾病类型 + 热量需求）
 * @returns 膳食处方推荐结果（dietType + nutritionRatio）
 */
export function recommendDietScriptByAi(input: AiDietScriptRecoInputV14): AiDietScriptRecoResultV14 {
  // 手算：dietType = disease.includes('糖尿病') ? '糖尿病饮食'
  //   : disease.includes('肾病') ? '低蛋白饮食' : '普通均衡饮食'
  // 测试2：disease='2型糖尿病' → includes('糖尿病')=true → '糖尿病饮食'
  // 测试3：disease='慢性肾病' → includes('糖尿病')=false, includes('肾病')=true → '低蛋白饮食'
  const dietType = input.disease.includes("糖尿病")
    ? "糖尿病饮食"
    : input.disease.includes("肾病")
      ? "低蛋白饮食"
      : "普通均衡饮食";
  // 手算：nutritionRatio = calorieNeeds >= 2000 ? '高蛋白高热量' : '常规热量配比'
  // 测试2：calorieNeeds=1800>=2000=false → '常规热量配比'
  // 测试3：calorieNeeds=2200>=2000=true → '高蛋白高热量'
  const nutritionRatio = input.calorieNeeds >= 2000 ? "高蛋白高热量" : "常规热量配比";
  return { dietType, nutritionRatio };
}

/**
 * 构建膳食处方推荐报告。
 *
 * @param result 膳食处方推荐结果
 * @returns 膳食处方推荐报告（dietType + nutritionRatio 透传）
 */
export function buildAiDietScriptRecoReport(result: AiDietScriptRecoResultV14): AiDietScriptRecoReportV14 {
  // 手算：透传 dietType + nutritionRatio
  // 测试4：{dietType='糖尿病饮食', nutritionRatio='常规热量配比'} → 透传
  return { dietType: result.dietType, nutritionRatio: result.nutritionRatio };
}
