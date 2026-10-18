/**
 * 健澜科技 jlmedaios - 质控科室改进建议 V14 聚合器（M501-C）
 *
 * 纯函数：科室改进建议生成 + 改进报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 改进建议结果 */
export interface ImproveSuggestResultV14 {
  dept: string;
  suggestions: string[];
}

/** 改进报告 */
export interface ImproveReportV14 {
  dept: string;
  suggestions: string[];
  count: number;
}

/**
 * 生成科室改进建议（按评分区间）。
 *
 * @param dept 科室名称
 * @param score 科室评分
 * @returns 改进建议结果
 */
export function suggestDeptImprove(dept: string, score: number): ImproveSuggestResultV14 {
  // 手算建议生成逻辑：按评分区间匹配
  // - <80 → 加强培训类建议
  // - 80-90 → 重点改进类建议
  // - >90 → 保持优势类建议
  const suggestions: string[] = [];
  if (score < 80) {
    suggestions.push("加强病历书写培训");
    suggestions.push("完善科室质控流程");
  } else if (score <= 90) {
    suggestions.push("重点改进薄弱环节");
    suggestions.push("开展专项质控抽查");
  } else {
    suggestions.push("保持现有优势");
    suggestions.push("总结经验推广全院");
  }
  return { dept, suggestions };
}

/**
 * 构建改进报告。
 *
 * @param result 改进建议结果
 * @returns 改进报告（dept + suggestions + count）
 */
export function buildImproveReport(result: ImproveSuggestResultV14): ImproveReportV14 {
  // 手算 count：建议列表的长度
  return {
    dept: result.dept,
    suggestions: result.suggestions,
    count: result.suggestions.length,
  };
}
