/**
 * 健澜科技 jlmedaios - 质控在线考试 V14 聚合器（M503-B）
 *
 * 纯函数：考试成绩提交 + 等级评定 + 考试报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 在线考试成绩 */
export interface OnlineExamV14 {
  user: string;
  score: number;
}

/** 考试报告 */
export interface ExamReportV14 {
  total: number;
  avgScore: number;
  passRate: number;
}

/**
 * 提交考试成绩。
 *
 * @param user 用户名
 * @param score 成绩
 * @returns 在线考试成绩
 */
export function submitExam(user: string, score: number): OnlineExamV14 {
  return { user, score };
}

/**
 * 评定考试等级。
 *
 * @param score 成绩
 * @returns 等级（优秀/良好/及格/不及格）
 */
export function gradeExam(score: number): string {
  // 手算等级：>=90优秀 / 80-89良好 / 60-79及格 / <60不及格
  if (score >= 90) return "优秀";
  if (score >= 80) return "良好";
  if (score >= 60) return "及格";
  return "不及格";
}

/**
 * 构建考试报告（总人数 + 平均分 + 通过率%）。
 *
 * @param exams 考试成绩数组
 * @returns 考试报告
 */
export function buildExamReport(exams: OnlineExamV14[]): ExamReportV14 {
  if (exams.length === 0) {
    return { total: 0, avgScore: 0, passRate: 0 };
  }
  // 手算 avgScore：所有成绩之和 / 人数，保留 1 位小数
  const sum = exams.reduce((acc, e) => acc + e.score, 0);
  const avgScore = Math.round((sum / exams.length) * 10) / 10;
  // 手算 passRate：>=60 算通过，Math.ceil(passCount/total*100)
  const passCount = exams.filter((e) => e.score >= 60).length;
  const passRate = Math.ceil((passCount / exams.length) * 100);
  return { total: exams.length, avgScore, passRate };
}
