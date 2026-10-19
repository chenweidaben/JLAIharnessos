/**
 * 健澜科技 jlmedaios - 病历AI肠外营养配置推荐 V14 聚合器（M564-D）
 *
 * 纯函数：构建 AI 肠外营养配置推荐基础数据 + AI 肠外营养配置推荐 + 构建肠外营养配置推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 肠外营养配置推荐基础数据 */
export interface AiParenteralNutritionRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 肠外营养配置推荐输入 */
export interface AiParenteralNutritionRecoInputV14 {
  days: number;
  hasLiverDysfunction: boolean;
}

/** AI 肠外营养配置推荐结果 */
export interface AiParenteralNutritionRecoResultV14 {
  aminoAcid: string;
  lipid: string;
}

/** 肠外营养配置推荐报告 */
export interface AiParenteralNutritionRecoReportV14 {
  aminoAcid: string;
  lipid: string;
}

/**
 * 构建 AI 肠外营养配置推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 肠外营养配置推荐基础数据
 */
export function buildAiParenteralNutritionReco(recordId: string, dept: string): AiParenteralNutritionRecoV14 {
  return { recordId, dept };
}

/**
 * AI 肠外营养配置推荐。
 * aminoAcid = days >= 7 ? '11.4%乐凡命' : '8.5%乐凡命'
 * lipid = hasLiverDysfunction ? '鱼油脂肪乳' : '20%脂肪乳剂'
 *
 * @param input 肠外营养配置推荐输入（肠外天数 + 肝功能异常）
 * @returns 肠外营养配置推荐结果（aminoAcid + lipid）
 */
export function recommendParenteralNutritionByAi(input: AiParenteralNutritionRecoInputV14): AiParenteralNutritionRecoResultV14 {
  // 手算：aminoAcid = days >= 7 ? '11.4%乐凡命' : '8.5%乐凡命'
  // 测试2：days=10>=7 → '11.4%乐凡命'
  // 测试3：days=3>=7=false → '8.5%乐凡命'
  const aminoAcid = input.days >= 7 ? "11.4%乐凡命" : "8.5%乐凡命";
  // 手算：lipid = hasLiverDysfunction ? '鱼油脂肪乳' : '20%脂肪乳剂'
  // 测试2：hasLiverDysfunction=true → '鱼油脂肪乳'
  // 测试3：hasLiverDysfunction=false → '20%脂肪乳剂'
  const lipid = input.hasLiverDysfunction ? "鱼油脂肪乳" : "20%脂肪乳剂";
  return { aminoAcid, lipid };
}

/**
 * 构建肠外营养配置推荐报告。
 *
 * @param result 肠外营养配置推荐结果
 * @returns 肠外营养配置推荐报告（aminoAcid + lipid 透传）
 */
export function buildAiParenteralNutritionRecoReport(result: AiParenteralNutritionRecoResultV14): AiParenteralNutritionRecoReportV14 {
  // 手算：透传 aminoAcid + lipid
  // 测试4：{aminoAcid='11.4%乐凡命', lipid='鱼油脂肪乳'} → 透传
  return { aminoAcid: result.aminoAcid, lipid: result.lipid };
}
