/**
 * 健澜科技 jlmedaios - 科研创新 V2 纯函数（M219-C）
 *
 * buildResearchReportV2 / scoreResearchOutput / trackResearchProject
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评分科研产出（纯函数）。
 *
 * @param papers SCI 论文数
 * @param patents 专利数
 * @param projects 课题数
 * @returns 分数
 */
export function scoreResearchOutput(papers: number, patents: number, projects: number): { score: number; level: string } {
  const score = papers * 2 + patents * 3 + projects * 5;
  let level = '一般';
  if (score >= 100) level = '优秀';
  else if (score < 30) level = '待提升';
  return { score, level };
}

/** 科研项目 */
export interface ResearchProject {
  name: string;
  funding: number;
  status: '在研' | '结题' | '验收';
}

/**
 * 追踪科研项目（纯函数）。
 *
 * @param projects 项目列表
 * @returns 在研率
 */
export function trackResearchProject(projects: ResearchProject[]): { activeRate: number; total: number } {
  const active = projects.filter((p) => p.status === '在研').length;
  const total = projects.length;
  return { activeRate: total > 0 ? Math.round((active / total) * 100) : 0, total };
}

/** 科研创新 V2 报告输出 */
export interface ResearchReportV2 {
  timeRange: string;
  projects: { nsfc: number; ministry: number; horizontal: number };
  output: { sci: number; patents: number; translation: number };
  platform: { lab: number; gcp: boolean; iit: number };
  clinical: { multicenter: number };
  ethics: { approved: number };
  funding: { total: number };
  cooperation: { partners: number };
  integrity: { audit: boolean };
  suggestions: string[];
}

/**
 * 构建科研创新 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 科研创新 V2 报告
 */
export function buildResearchReportV2(timeRange: string): ResearchReportV2 {
  return {
    timeRange,
    projects: { nsfc: 5, ministry: 2, horizontal: 20 },
    output: { sci: 50, patents: 10, translation: 3 },
    platform: { lab: 1, gcp: true, iit: 15 },
    clinical: { multicenter: 8 },
    ethics: { approved: 100 },
    funding: { total: 5000 },
    cooperation: { partners: 20 },
    integrity: { audit: true },
    suggestions: ['提高成果转化数', '争取国家级课题'],
  };
}
