/**
 * 健澜科技 jlmedaios - 虚拟病例演练与团队复盘 V5 纯函数（M276-C）
 *
 * generateDrillCaseV5 / scoreDrillV5 / buildDebriefV5 / buildDrillCaseV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 演练病例 */
export interface DrillCase {
  id: string;
  title: string;
  specialty: string;
  difficulty: "easy" | "medium" | "hard";
  virtualSteps: string[];
  correctPath: string[];
  teamId: string;
  outcomeScore: number;
  debriefNotes: string;
}

/**
 * 生成虚拟病例 V5（纯函数）。
 *
 * @param specialty 专科
 * @param difficulty 难度
 * @returns 病例
 */
export function generateDrillCaseV5(specialty: string, difficulty: "easy" | "medium" | "hard"): Pick<DrillCase, "title" | "specialty" | "difficulty" | "virtualSteps" | "correctPath"> {
  const title = `${specialty}模拟病例-${difficulty}`;
  const virtualSteps = ["采集病史", "体格检查", "辅助检查", "诊断", "治疗"];
  const correctPath = difficulty === "hard"
    ? ["采集病史", "鉴别诊断", "辅助检查", "诊断", "治疗", "随访"]
    : virtualSteps;
  return { title, specialty, difficulty, virtualSteps, correctPath };
}

/**
 * 演练评分 V5（纯函数）：步数重合度 × 100。
 *
 * @param steps 学员走的步骤
 * @param correct 正确路径
 * @returns 得分
 */
export function scoreDrillV5(steps: string[], correct: string[]): { score: number; matched: number; missed: string[]; extra: string[] } {
  const correctSet = new Set(correct);
  const stepSet = new Set(steps);
  const matched = steps.filter((s) => correctSet.has(s)).length;
  const missed = correct.filter((s) => !stepSet.has(s));
  const extra = steps.filter((s) => !correctSet.has(s));
  const score = correct.length > 0 ? Math.round((matched / correct.length) * 100) : 0;
  return { score, matched, missed, extra };
}

/**
 * 构建团队复盘 V5（纯函数）。
 *
 * @param outcome 演练得分
 * @returns 复盘建议
 */
export function buildDebriefV5(outcome: { score: number; missed: string[] }): { summary: string; focusAreas: string[]; pass: boolean } {
  let summary = "演练达标";
  let pass = true;
  if (outcome.score < 60) {
    summary = "演练未达标，需针对性补训";
    pass = false;
  } else if (outcome.score < 80) {
    summary = "演练基本达标，仍有提升空间";
  }
  return { summary, focusAreas: outcome.missed, pass };
}

/** 演练报告输出 */
export interface DrillCaseV5Report {
  totalCases: number;
  avgScore: number;
  bySpecialty: Record<string, number>;
  byDifficulty: Record<string, number>;
  passRate: number;
  suggestions: string[];
}

/**
 * 构建演练报告（纯函数）。
 *
 * @param cases 病例列表
 * @returns 报告
 */
export function buildDrillCaseV5Report(cases: DrillCase[]): DrillCaseV5Report {
  const bySpecialty: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  let scoreSum = 0;
  let passCount = 0;
  for (const c of cases) {
    bySpecialty[c.specialty] = (bySpecialty[c.specialty] ?? 0) + 1;
    byDifficulty[c.difficulty] = (byDifficulty[c.difficulty] ?? 0) + 1;
    scoreSum += c.outcomeScore;
    if (c.outcomeScore >= 60) passCount += 1;
  }
  const avgScore = cases.length > 0 ? Math.round(scoreSum / cases.length) : 0;
  const passRate = cases.length > 0 ? Math.round((passCount / cases.length) * 1000) / 10 : 0;
  return {
    totalCases: cases.length,
    avgScore,
    bySpecialty,
    byDifficulty,
    passRate,
    suggestions: passRate < 70
      ? ["团队演练通过率偏低，增加 hard 难度病例频次"]
      : ["演练通过良好，持续复盘改进"],
  };
}
