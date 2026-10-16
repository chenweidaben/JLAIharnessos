/**
 * 健澜科技 jlmedaios - 科研管理 V4 纯函数（M254-B）
 *
 * buildResearchManagementV4Report / scoreResearchOutputV4 / trackResearchProjectV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评分科研产出 V4（纯函数）。
 *
 * @param papers 论文
 * @param patents 专利
 * @param projects 课题
 * @returns 评分
 */
export function scoreResearchOutputV4(papers: number, patents: number, projects: number): { score: number; level: string } {
  const score = papers * 10 + patents * 20 + projects * 30;
  let level = "良好";
  if (score >= 200) level = "优秀";
  else if (score >= 100) level = "良好";
  else level = "一般";
  return { score, level };
}

/**
 * 追踪科研项目 V4（纯函数）。
 *
 * @param projects 项目
 * @returns 追踪
 */
export function trackResearchProjectV4(projects: { name: string; stage: string }[]): { total: number; stages: { proposal: number; midterm: number; final: number } } {
  const stages = { proposal: 0, midterm: 0, final: 0 };
  for (const p of projects) {
    if (p.stage === "立项") stages.proposal++;
    else if (p.stage === "中期") stages.midterm++;
    else if (p.stage === "结题") stages.final++;
  }
  return { total: projects.length, stages };
}

/** 科研管理 V4 报告输出 */
export interface ResearchManagementV4Report {
  timeRange: string;
  projects: { nsfc: number; most: number; provincial: number; municipal: number; horizontal: number; internal: number };
  papers: { sci: number; core: number; if: number; citation: number; quartile: number };
  patents: { invention: number; utility: number; design: number; software: number; transfer: number };
  platform: { keyLab: number; engineeringCenter: number; clinicalResearch: number; pi: number; biobank: number };
  team: { pi: number; talent: number; network: number; interdisciplinary: number; intlCollab: number };
  ethics: { review: number; consent: number; tracking: number; committee: number; fast: number };
  kpi: { perCapitaPaper: number; perCapitaProject: number; perCapitaPatent: number; award: number };
  system: { projectDb: number; resultDb: number; paperDb: number; ethicsDb: number; grantDb: number };
  suggestions: string[];
}

/**
 * 构建科研管理 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 科研管理 V4 报告
 */
export function buildResearchManagementV4Report(timeRange: string): ResearchManagementV4Report {
  return {
    timeRange,
    projects: { nsfc: 5, most: 2, provincial: 20, municipal: 30, horizontal: 50, internal: 100 },
    papers: { sci: 100, core: 300, if: 300, citation: 2000, quartile: 50 },
    patents: { invention: 20, utility: 50, design: 10, software: 30, transfer: 5 },
    platform: { keyLab: 2, engineeringCenter: 1, clinicalResearch: 5, pi: 30, biobank: 1 },
    team: { pi: 30, talent: 50, network: 100, interdisciplinary: 20, intlCollab: 10 },
    ethics: { review: 200, consent: 200, tracking: 180, committee: 12, fast: 30 },
    kpi: { perCapitaPaper: 0.5, perCapitaProject: 0.2, perCapitaPatent: 0.1, award: 10 },
    system: { projectDb: 100, resultDb: 500, paperDb: 500, ethicsDb: 200, grantDb: 200 },
    suggestions: ["提升国自然数量", "促进成果转化"],
  };
}
