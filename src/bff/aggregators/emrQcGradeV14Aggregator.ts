/**
 * 健澜科技 jlmedaios - 病历质控等级评定 V14 聚合器（M479-C）
 *
 * 纯函数：根据分数评定质控等级。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控等级结果 */
export interface QcGradeResultV14 {
  score: number;
  grade: string;
}

/**
 * 根据分数评定质控等级。
 *
 * 规则：>=90 优秀、80-89 良好、60-79 合格、<60 不合格。
 *
 * @param score 质控分数（0-100）
 * @returns 等级评定结果
 */
export function evaluateQcGrade(score: number): QcGradeResultV14 {
  let grade: string;
  if (score >= 90) {
    grade = "优秀";
  } else if (score >= 80) {
    grade = "良好";
  } else if (score >= 60) {
    grade = "合格";
  } else {
    grade = "不合格";
  }
  return { score, grade };
}
