/**
 * 健澜科技 jlmedaios - 科研创新 V3 纯函数（M242-C）
 *
 * buildResearchV3Report / scoreResearchOutputV3 / trackResearchProjectV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评分科研产出 V3（纯函数）。
 *
 * @param papers 论文
 * @param patents 专利
 * @param projects 项目
 * @returns 评分
 */
export function scoreResearchOutputV3(papers: number, patents: number, projects: number): { score: number; level: string } {
  const score = papers * 10 + patents * 5 + projects * 20;
  let level = "一般";
  if (score >= 500) level = "优秀";
  else if (score >= 200) level = "良好";
  return { score, level };
}

/**
 * 追踪科研项目 V3（纯函数）。
 *
 * @param projects 项目
 * @returns 追踪
 */
export function trackResearchProjectV3(projects: { total: number; funded: number; completed: number }): { total: number; funded: number; completed: number; rate: number } {
  const rate = Math.round((projects.completed / projects.total) * 100);
  return { total: projects.total, funded: projects.funded, completed: projects.completed, rate };
}

/** 科研创新 V3 报告输出 */
export interface ResearchV3Report {
  timeRange: string;
  grants: { nsfc: number; most: number; provincial: number; horizontal: number };
  output: { sci: number; chinese: number; patents: number; awards: number };
  platform: { keyLab: number; gcp: number; iit: number };
  ethics: number;
  funding: number;
  suggestions: string[];
}

/**
 * 构建科研创新 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 科研创新 V3 报告
 */
export function buildResearchV3Report(timeRange: string): ResearchV3Report {
  return {
    timeRange,
    grants: { nsfc: 20, most: 5, provincial: 50, horizontal: 100 },
    output: { sci: 200, chinese: 500, patents: 100, awards: 20 },
    platform: { keyLab: 3, gcp: 1, iit: 30 },
    ethics: 200,
    funding: 5000,
    suggestions: ["冲击国自然重点", "加强成果转化"],
  };
}
