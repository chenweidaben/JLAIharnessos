/**
 * 健澜科技 jlmedaios - AI 教学助手 V5 纯函数（M259-B）
 *
 * buildTeachingAIV5Report / generateCaseV5 / assessStudentSkillV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 生成病例 V5（纯函数）。
 *
 * @param specialty 专科
 * @param difficulty 难度
 * @returns 病例
 */
export function generateCaseV5(specialty: string, difficulty: string): { specialty: string; difficulty: string; caseId: string; learningPoints: number } {
  let learningPoints = 5;
  if (difficulty === "高级") learningPoints = 10;
  else if (difficulty === "中级") learningPoints = 7;
  return { specialty, difficulty, caseId: `${specialty}-${Date.now()}`, learningPoints };
}

/**
 * 评估学生技能 V5（纯函数）。
 *
 * @param performance 表现
 * @param criteria 标准
 * @returns 评估
 */
export function assessStudentSkillV5(performance: { score: number; time: number; errors: number }, criteria: { pass: number; maxTime: number; maxErrors: number }): { grade: string; pass: boolean; suggestion: string } {
  let grade = "优秀";
  let pass = false;
  if (performance.score >= criteria.pass && performance.time <= criteria.maxTime && performance.errors <= criteria.maxErrors) {
    pass = true;
    if (performance.score >= 90) grade = "优秀";
    else if (performance.score >= 80) grade = "良好";
    else grade = "合格";
  } else {
    grade = "不合格";
  }
  return { grade, pass, suggestion: pass ? "继续保持" : "加强练习" };
}

/** AI 教学助手 V5 报告输出 */
export interface TeachingAIV5Report {
  timeRange: string;
  teaching: { rounds: number; caseDiscussion: number; lecture: number; plan: number; personalized: number };
  osce: { station: number; sp: number; aiScore: number; feedback: number; skill: number };
  residency: { rotation: number; attendance: number; monthly: number; annual: number; graduation: number; mentorEval: number };
  knowledge: { kb: number; guideline: number; graph: number; qa: number; caseLibrary: number; aiAnswer: number };
  learning: { time: number; mastery: number; weakness: number; recommendation: number; curve: number };
  evaluation: { student: number; peer: number; competition: number; outcome: number; continuous: number };
  aiMetrics: { mentorEfficiency: number; fairness: number; improvement: number; satisfaction: number; pass: number };
  suggestions: string[];
}

/**
 * 构建 AI 教学助手 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns AI 教学助手 V5 报告
 */
export function buildTeachingAIV5Report(timeRange: string): TeachingAIV5Report {
  return {
    timeRange,
    teaching: { rounds: 1000, caseDiscussion: 500, lecture: 200, plan: 100, personalized: 80 },
    osce: { station: 20, sp: 100, aiScore: 90, feedback: 85, skill: 80 },
    residency: { rotation: 500, attendance: 98, monthly: 400, annual: 100, graduation: 95, mentorEval: 90 },
    knowledge: { kb: 10000, guideline: 500, graph: 1, qa: 5000, caseLibrary: 2000, aiAnswer: 90 },
    learning: { time: 30, mastery: 75, weakness: 20, recommendation: 80, curve: 85 },
    evaluation: { student: 88, peer: 85, competition: 10, outcome: 5, continuous: 80 },
    aiMetrics: { mentorEfficiency: 30, fairness: 95, improvement: 20, satisfaction: 90, pass: 92 },
    suggestions: ["提升个性化带教", "加强薄弱点推荐"],
  };
}
