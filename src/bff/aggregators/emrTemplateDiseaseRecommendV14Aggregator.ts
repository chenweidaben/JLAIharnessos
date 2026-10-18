/**
 * 健澜科技 jlmedaios - 病种模板智能推荐 V14 聚合器（M525-B）
 *
 * 纯函数：构建病种推荐基础数据 + 病种模板推荐 + 构建推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病种推荐基础数据 */
export interface DiseaseRecommendV14 {
  diseaseName: string;
  dept: string;
}

/** 候选模板项 */
export interface CandidateTemplateV14 {
  name: string;
  dept: string;
  matchScore: number;
}

/** 推荐输入 */
export interface DiseaseRecommendInputV14 {
  diseaseName: string;
  templates: CandidateTemplateV14[];
}

/** 推荐结果 */
export interface DiseaseRecommendResultV14 {
  topTemplate: string;
  recommendCount: number;
}

/** 推荐报告 */
export interface DiseaseRecommendReportV14 {
  topTemplate: string;
  recommendCount: number;
}

/**
 * 构建病种推荐基础数据。
 *
 * @param diseaseName 病种名
 * @param dept 科室
 * @returns 病种推荐基础数据
 */
export function buildDiseaseRecommend(diseaseName: string, dept: string): DiseaseRecommendV14 {
  return { diseaseName, dept };
}

/**
 * 病种模板推荐。
 * recommendCount = templates 中 matchScore >= 60 的项数；topTemplate = matchScore 最高项的 name，空数组返回 '无推荐模板'。
 *
 * @param input 推荐输入（病种名 + 候选模板列表）
 * @returns 推荐结果（topTemplate + recommendCount）
 */
export function recommendDiseaseTemplate(input: DiseaseRecommendInputV14): DiseaseRecommendResultV14 {
  // 手算：recommendCount = templates 中 matchScore >= 60 的项数
  // 测试2：templates=[冠心病入院模板(85), 高血压门诊模板(70), 糖尿病随访模板(40)]
  // 手算：85>=60 ✓, 70>=60 ✓, 40<60 ✗ → recommendCount=2
  // 测试3：templates=[冠心病入院模板(85), 糖尿病随访模板(40)]
  // 手算：85>=60 ✓, 40<60 ✗ → recommendCount=1
  let recommendCount = 0;
  for (const t of input.templates) {
    if (t.matchScore >= 60) {
      recommendCount++;
    }
  }
  // 手算：topTemplate = matchScore 最高项的 name，空数组返回 '无推荐模板'
  // 测试2：matchScore 最高 = 85 → topTemplate='冠心病入院模板'
  // 测试3：matchScore 最高 = 85 → topTemplate='冠心病入院模板'
  let topTemplate = "无推荐模板";
  let maxScore = -1;
  for (const t of input.templates) {
    if (t.matchScore > maxScore) {
      maxScore = t.matchScore;
      topTemplate = t.name;
    }
  }
  return { topTemplate, recommendCount };
}

/**
 * 构建推荐报告。
 *
 * @param result 推荐结果
 * @returns 推荐报告（topTemplate + recommendCount 透传）
 */
export function buildDiseaseRecommendReport(result: DiseaseRecommendResultV14): DiseaseRecommendReportV14 {
  // 手算：透传 topTemplate + recommendCount
  // 测试4：{topTemplate:'冠心病入院模板', recommendCount:2} → topTemplate='冠心病入院模板', recommendCount=2
  return { topTemplate: result.topTemplate, recommendCount: result.recommendCount };
}
