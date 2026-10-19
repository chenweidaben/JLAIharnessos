/**
 * 健澜科技 jlmedaios - 病历AI术前评估智能推荐 V14 聚合器（M562-A）
 *
 * 纯函数：构建 AI 术前评估智能推荐基础数据 + AI 术前评估智能推荐 + 构建术前评估智能推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 术前评估智能推荐基础数据 */
export interface AiPreopAssessRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 术前评估智能推荐输入 */
export interface AiPreopAssessRecoInputV14 {
  patientAge: number;
  hasHeartDisease: boolean;
  hasDiabetes: boolean;
}

/** AI 术前评估智能推荐结果 */
export interface AiPreopAssessRecoResultV14 {
  recommendItems: string[];
  riskLevel: string;
}

/** 术前评估智能推荐报告 */
export interface AiPreopAssessRecoReportV14 {
  recommendItems: string[];
  riskLevel: string;
}

/**
 * 构建 AI 术前评估智能推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 术前评估智能推荐基础数据
 */
export function buildAiPreopAssessReco(recordId: string, dept: string): AiPreopAssessRecoV14 {
  return { recordId, dept };
}

/**
 * AI 术前评估智能推荐。
 * recommendItems = patientAge >= 70 ? ['心电图','心脏彩超','肺功能']
 *   : hasHeartDisease ? ['心电图','心脏彩超'] : ['血常规','凝血功能']
 * riskLevel = (patientAge >= 70 && hasHeartDisease) ? '高风险'
 *   : (patientAge >= 70 || hasHeartDisease) ? '中风险' : '低风险'
 *
 * @param input 术前评估智能推荐输入（年龄 + 心脏病史 + 糖尿病史）
 * @returns 术前评估智能推荐结果（recommendItems + riskLevel）
 */
export function recommendPreopAssessByAi(input: AiPreopAssessRecoInputV14): AiPreopAssessRecoResultV14 {
  // 手算：recommendItems = patientAge >= 70 ? ['心电图','心脏彩超','肺功能']
  //   : hasHeartDisease ? ['心电图','心脏彩超'] : ['血常规','凝血功能']
  // 测试2：patientAge=75 >= 70 → ['心电图','心脏彩超','肺功能']
  // 测试3：patientAge=45 < 70, hasHeartDisease=false → ['血常规','凝血功能']
  const recommendItems: string[] = input.patientAge >= 70
    ? ["心电图", "心脏彩超", "肺功能"]
    : input.hasHeartDisease
      ? ["心电图", "心脏彩超"]
      : ["血常规", "凝血功能"];
  // 手算：riskLevel = (patientAge >= 70 && hasHeartDisease) ? '高风险'
  //   : (patientAge >= 70 || hasHeartDisease) ? '中风险' : '低风险'
  // 测试2：(75>=70 && true)=true → '高风险'
  // 测试3：(45>=70 && false)=false；(45>=70 || false)=false → '低风险'
  const riskLevel = (input.patientAge >= 70 && input.hasHeartDisease)
    ? "高风险"
    : (input.patientAge >= 70 || input.hasHeartDisease)
      ? "中风险"
      : "低风险";
  return { recommendItems, riskLevel };
}

/**
 * 构建术前评估智能推荐报告。
 *
 * @param result 术前评估智能推荐结果
 * @returns 术前评估智能推荐报告（recommendItems + riskLevel 透传）
 */
export function buildAiPreopAssessRecoReport(result: AiPreopAssessRecoResultV14): AiPreopAssessRecoReportV14 {
  // 手算：透传 recommendItems + riskLevel
  // 测试4：{recommendItems=['心电图'], riskLevel='高风险'} → 透传
  return { recommendItems: result.recommendItems, riskLevel: result.riskLevel };
}
