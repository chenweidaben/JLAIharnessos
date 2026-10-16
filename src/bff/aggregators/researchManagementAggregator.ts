/**
 * 健澜科技 jlmedaios - 科研管理纯函数（M191-A）
 *
 * buildResearchManagementReport / calculateResearchScore
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 科研数据 */
export interface ResearchData {
  nationalProjects: number;
  provincialProjects: number;
  sciPapers: number;
  corePapers: number;
  patents: number;
  conversionRate: number;
}

/**
 * 科研绩效评分（纯函数）。
 *
 * @param data 科研数据
 * @returns 0-100 分
 */
export function calculateResearchScore(data: ResearchData): number {
  const score =
    data.nationalProjects * 15 +
    data.provincialProjects * 8 +
    data.sciPapers * 3 +
    data.corePapers * 1.5 +
    data.patents * 2 +
    data.conversionRate * 20;
  return Math.min(100, Math.round(score));
}

/** 科研报告输出 */
export interface ResearchManagementReport {
  dept: string;
  timeRange: string;
  projects: { national: number; provincial: number; municipal: number; dept: number };
  papers: { sci: number; core: number; stats: number; totalIF: number };
  achievements: { patents: number; softwareCopyrights: number; awards: number };
  personnel: { phd: number; master: number; senior: number; deputySenior: number };
  platforms: { keyLab: number; researchCenter: number };
  conversionRate: number;
  researchScore: number;
  suggestions: string[];
}

/**
 * 构建科研管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 科研报告
 */
export function buildResearchManagementReport(dept: string, timeRange: string): ResearchManagementReport {
  const data: ResearchData = {
    nationalProjects: 2,
    provincialProjects: 5,
    sciPapers: 8,
    corePapers: 15,
    patents: 3,
    conversionRate: 0.3,
  };

  const researchScore = calculateResearchScore(data);

  const suggestions: string[] = [];
  if (data.sciPapers < 5) {
    suggestions.push('SCI 论文数量偏少，建议鼓励临床科研结合');
  }
  if (data.conversionRate < 0.4) {
    suggestions.push('科研转化率偏低，建议加强产学研合作');
  }

  return {
    dept,
    timeRange,
    projects: { national: 2, provincial: 5, municipal: 8, dept: 12 },
    papers: { sci: 8, core: 15, stats: 20, totalIF: 35 },
    achievements: { patents: 3, softwareCopyrights: 5, awards: 2 },
    personnel: { phd: 6, master: 18, senior: 8, deputySenior: 15 },
    platforms: { keyLab: 1, researchCenter: 2 },
    conversionRate: data.conversionRate,
    researchScore,
    suggestions,
  };
}
