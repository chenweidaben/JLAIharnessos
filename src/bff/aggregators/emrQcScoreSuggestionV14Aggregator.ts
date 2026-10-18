/**
 * 健澜科技 jlmedaios - 质控评分改进建议 V14 聚合器（M492-D，M492 收官）
 *
 * 纯函数：评分改进建议生成 + 建议报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 评分改进建议 */
export interface ScoreSuggestionV14 {
  score: number;
  level: string;
  suggestions: string[];
}

/** 建议报告 */
export interface SuggestionReportV14 {
  level: string;
  suggestions: string[];
}

/**
 * 根据评分生成改进建议（<60 差/<80 中/<90 良/>=90 优）。
 *
 * @param score 评分
 * @returns 改进建议
 */
export function generateScoreSuggestion(score: number): ScoreSuggestionV14 {
  // 手算分级：<60=差 / <80=中 / <90=良 / >=90=优
  if (score < 60) {
    return {
      score,
      level: "差",
      suggestions: ["立即整改病历核心缺陷", "开展病历书写专项培训", "建立每日病历质控机制"],
    };
  }
  if (score < 80) {
    return {
      score,
      level: "中",
      suggestions: ["针对性改进薄弱环节", "加强病历内涵质量", "定期开展质控反馈"],
    };
  }
  if (score < 90) {
    return {
      score,
      level: "良",
      suggestions: ["持续巩固现有质量", "关注细节提升规范性", "推进病历同质化"],
    };
  }
  return {
    score,
    level: "优",
    suggestions: ["保持高质量水平", "总结经验推广示范", "持续创新病历管理"],
  };
}

/**
 * 构建建议报告（level+suggestions）。
 *
 * @param suggestion 改进建议
 * @returns 建议报告
 */
export function buildSuggestionReport(suggestion: ScoreSuggestionV14): SuggestionReportV14 {
  return { level: suggestion.level, suggestions: suggestion.suggestions };
}
