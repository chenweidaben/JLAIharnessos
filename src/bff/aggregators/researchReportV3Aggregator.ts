/**
 * 健澜科技 jlmedaios - 科研管理深化 V3 纯函数（M207-B）
 *
 * buildResearchReportV3 / scoreResearchOutput / assessEthicsRisk
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 科研产出评分（纯函数）。
 *
 * @param papers 论文数
 * @param patents 专利数
 * @param projects 项目数
 * @returns 评分
 */
export function scoreResearchOutput(papers: number, patents: number, projects: number): number {
  return Math.round(papers * 10 + patents * 20 + projects * 30);
}

/** 伦理审查方案 */
export interface EthicsProtocol {
  involvesHuman: boolean;
  vulnerablePopulation: boolean;
  informedConsent: boolean;
}

/**
 * 伦理风险评估（纯函数）。
 *
 * @param protocol 方案
 * @returns 风险等级
 */
export function assessEthicsRisk(protocol: EthicsProtocol): { riskLevel: string; requiresFullReview: boolean } {
  let score = 0;
  if (protocol.involvesHuman) score++;
  if (protocol.vulnerablePopulation) score += 2;
  if (!protocol.informedConsent) score += 2;

  let riskLevel = '低风险';
  if (score >= 4) riskLevel = '高风险';
  else if (score >= 2) riskLevel = '中风险';

  return { riskLevel, requiresFullReview: score >= 2 };
}

/** 科研 V3 报告输出 */
export interface ResearchReportV3 {
  timeRange: string;
  projects: { national: number; provincial: number; horizontal: number; internal: number };
  papers: { sci: number; core: number; citations: number };
  patents: { invention: number; utility: number };
  awards: { provincial: number };
  teams: { key: number };
  platforms: { key: number };
  ethics: { reviewed: number; pending: number };
  performance: { score: number };
  suggestions: string[];
}

/**
 * 构建科研 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 科研 V3 报告
 */
export function buildResearchReportV3(timeRange: string): ResearchReportV3 {
  return {
    timeRange,
    projects: { national: 5, provincial: 20, horizontal: 30, internal: 50 },
    papers: { sci: 100, core: 200, citations: 2000 },
    patents: { invention: 20, utility: 30 },
    awards: { provincial: 5 },
    teams: { key: 3 },
    platforms: { key: 2 },
    ethics: { reviewed: 100, pending: 10 },
    performance: { score: 85 },
    suggestions: ['提高国家级项目数', '增加 SCI 论文产出'],
  };
}
