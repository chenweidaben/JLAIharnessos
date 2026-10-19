/**
 * 健澜科技 jlmedaios - 病历AI康复评估推荐 V14 聚合器（M563-A）
 *
 * 纯函数：构建 AI 康复评估推荐基础数据 + AI 康复评估推荐 + 构建康复评估推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 康复评估推荐基础数据 */
export interface AiRehabAssessRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 康复评估推荐输入 */
export interface AiRehabAssessRecoInputV14 {
  diagnosis: string;
  mobility: string;
}

/** AI 康复评估推荐结果 */
export interface AiRehabAssessRecoResultV14 {
  assessItems: string[];
  rehabLevel: string;
}

/** 康复评估推荐报告 */
export interface AiRehabAssessRecoReportV14 {
  assessItems: string[];
  rehabLevel: string;
}

/**
 * 构建 AI 康复评估推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 康复评估推荐基础数据
 */
export function buildAiRehabAssessReco(recordId: string, dept: string): AiRehabAssessRecoV14 {
  return { recordId, dept };
}

/**
 * AI 康复评估推荐。
 * assessItems = diagnosis.includes('卒中') ? ['肌力评估','平衡评估','言语评估']
 *   : diagnosis.includes('骨折') ? ['关节活动度','肌力评估'] : ['日常生活能力评估']
 * rehabLevel = mobility === '卧床' ? '重度'
 *   : mobility === '辅助行走' ? '中度' : '轻度'
 *
 * @param input 康复评估推荐输入（诊断 + 活动能力）
 * @returns 康复评估推荐结果（assessItems + rehabLevel）
 */
export function recommendRehabAssessByAi(input: AiRehabAssessRecoInputV14): AiRehabAssessRecoResultV14 {
  // 手算：assessItems = diagnosis.includes('卒中') ? ['肌力评估','平衡评估','言语评估']
  //   : diagnosis.includes('骨折') ? ['关节活动度','肌力评估'] : ['日常生活能力评估']
  // 测试2：diagnosis='脑卒中后偏瘫' → includes('卒中')=true → ['肌力评估','平衡评估','言语评估']
  // 测试3：diagnosis='膝关节骨关节炎' → includes('卒中')=false, includes('骨折')=false → ['日常生活能力评估']
  const assessItems: string[] = input.diagnosis.includes("卒中")
    ? ["肌力评估", "平衡评估", "言语评估"]
    : input.diagnosis.includes("骨折")
      ? ["关节活动度", "肌力评估"]
      : ["日常生活能力评估"];
  // 手算：rehabLevel = mobility === '卧床' ? '重度'
  //   : mobility === '辅助行走' ? '中度' : '轻度'
  // 测试2：mobility='卧床' → '重度'
  // 测试3：mobility='自主行走' → '轻度'
  const rehabLevel = input.mobility === "卧床" ? "重度"
    : input.mobility === "辅助行走" ? "中度" : "轻度";
  return { assessItems, rehabLevel };
}

/**
 * 构建康复评估推荐报告。
 *
 * @param result 康复评估推荐结果
 * @returns 康复评估推荐报告（assessItems + rehabLevel 透传）
 */
export function buildAiRehabAssessRecoReport(result: AiRehabAssessRecoResultV14): AiRehabAssessRecoReportV14 {
  // 手算：透传 assessItems + rehabLevel
  // 测试4：{assessItems=['肌力评估'], rehabLevel='重度'} → 透传
  return { assessItems: result.assessItems, rehabLevel: result.rehabLevel };
}
