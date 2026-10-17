/**
 * 健澜科技 jlmedaios - 临床研究项目 V13 纯函数（M327-A）
 *
 * countActiveProjectsV13 / sumProjectFundingV13 / countPublishedPapersV13 / checkGcpComplianceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 研究项目 */
export interface ResearchProjectV13 {
  projectName: string;
  funding: number;
  publishedPapers: number;
  gcpPassed: boolean;
}

/**
 * 在研项目数（纯函数）：总数。
 *
 * @param projects 项目列表
 * @returns 在研项目数
 */
export function countActiveProjectsV13(projects: ResearchProjectV13[]): number {
  return projects.length;
}

/**
 * 立项经费总额（纯函数）：求和，万元。
 *
 * @param projects 项目列表
 * @returns 经费总额（万元）
 */
export function sumProjectFundingV13(projects: ResearchProjectV13[]): number {
  return projects.reduce((acc, p) => acc + p.funding, 0);
}

/**
 * 论文发表数（纯函数）：求和。
 *
 * @param projects 项目列表
 * @returns 论文总数
 */
export function countPublishedPapersV13(projects: ResearchProjectV13[]): number {
  return projects.reduce((acc, p) => acc + p.publishedPapers, 0);
}

/**
 * GCP 合规（纯函数）：是否全部通过。
 *
 * @param projects 项目列表
 * @returns 是否全部通过 GCP
 */
export function checkGcpComplianceV13(projects: ResearchProjectV13[]): boolean {
  if (projects.length === 0) return true;
  return projects.every((p) => p.gcpPassed);
}
