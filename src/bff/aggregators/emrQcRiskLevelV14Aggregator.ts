/**
 * 健澜科技 jlmedaios - 质控风险等级评估 V14 聚合器（M495-C）
 *
 * 纯函数：风险等级评估 + 风险等级报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 风险等级 */
export interface RiskLevelV14 {
  score: number;
  level: string;
}

/** 风险等级报告 */
export interface RiskLevelReportV14 {
  level: string;
  score: number;
  suggestion: string;
}

/**
 * 按评分评估风险等级（>=90→低风险/70-89→中风险/<70→高风险）。
 *
 * @param score 评分
 * @returns 风险等级
 */
export function assessRiskLevel(score: number): RiskLevelV14 {
  // 手算分级：>=90=低风险 / 70<=score<90=中风险 / <70=高风险
  if (score >= 90) {
    return { score, level: "低风险" };
  }
  if (score >= 70) {
    return { score, level: "中风险" };
  }
  return { score, level: "高风险" };
}

/**
 * 构建风险等级报告（level+score+建议）。
 *
 * @param level 风险等级
 * @param score 评分
 * @returns 风险等级报告
 */
export function buildRiskLevelReport(level: string, score: number): RiskLevelReportV14 {
  // 手算建议：低风险→保持/中风险→改进/高风险→立即整改
  let suggestion = "立即整改";
  if (level === "低风险") {
    suggestion = "保持现有水平";
  } else if (level === "中风险") {
    suggestion = "针对性改进";
  }
  return { level, score, suggestion };
}
