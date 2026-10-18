/**
 * 健澜科技 jlmedaios - 质控规则智能推荐 V14 聚合器（M520-A）
 *
 * 纯函数：构建推荐基础数据 + 推荐规则 + 构建推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 推荐基础数据 */
export interface RuleRecommendationV14 {
  dept: string;
  recordType: string;
}

/** 推荐上下文 */
export interface RecommendationContextV14 {
  dept: string;
  recordType: string;
}

/** 推荐结果 */
export interface RecommendationResultV14 {
  recommended: string[];
  count: number;
}

/** 推荐报告 */
export interface RecommendationReportV14 {
  count: number;
  topRule: string;
}

/**
 * 构建推荐基础数据。
 *
 * @param dept 科室
 * @param recordType 病历类型
 * @returns 推荐基础数据
 */
export function buildRuleRecommendation(dept: string, recordType: string): RuleRecommendationV14 {
  return { dept, recordType };
}

/**
 * 推荐规则。
 * candidateRules 中包含 recordType 子串的项即匹配推荐。
 *
 * @param context 推荐上下文
 * @param candidateRules 候选规则列表
 * @returns 推荐结果（recommended + count）
 */
export function recommendRules(context: RecommendationContextV14, candidateRules: string[]): RecommendationResultV14 {
  // 手算检查：candidateRules 中包含 recordType 子串的项即匹配推荐
  const recommended: string[] = [];
  for (const rule of candidateRules) {
    if (rule.includes(context.recordType)) {
      recommended.push(rule);
    }
  }
  return { recommended, count: recommended.length };
}

/**
 * 构建推荐报告。
 * topRule=推荐列表第一项，空列表返回'无推荐'。
 *
 * @param result 推荐结果（只需 recommended）
 * @returns 推荐报告（count + topRule）
 */
export function buildRuleRecommendationReport(result: { recommended: string[]; count?: number }): RecommendationReportV14 {
  // 手算：topRule=推荐列表第一项，空列表返回'无推荐'
  const topRule = result.recommended.length > 0 ? result.recommended[0] : "无推荐";
  return { count: result.recommended.length, topRule };
}
