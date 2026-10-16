/**
 * 健澜科技 jlmedaios - DevOps 深化纯函数（M197-C）
 *
 * buildDevOpsReport / calculateDevOpsDORA / optimizeCIPipeline
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** DORA 指标 */
export interface DORAMetrics {
  deploymentFrequency: number;
  leadTimeHours: number;
  changeFailRate: number;
  mttrMinutes: number;
}

/**
 * 计算 DORA 等级（纯函数）。
 *
 * @param metrics DORA 指标
 * @returns 等级
 */
export function calculateDevOpsDORA(metrics: DORAMetrics): { level: string; score: number } {
  let score = 0;
  if (metrics.deploymentFrequency > 1) score += 25;
  else if (metrics.deploymentFrequency > 0.5) score += 15;
  else score += 5;

  if (metrics.leadTimeHours < 24) score += 25;
  else if (metrics.leadTimeHours < 168) score += 15;
  else score += 5;

  if (metrics.changeFailRate < 0.15) score += 25;
  else if (metrics.changeFailRate < 0.3) score += 15;
  else score += 5;

  if (metrics.mttrMinutes < 60) score += 25;
  else if (metrics.mttrMinutes < 240) score += 15;
  else score += 5;

  const level = score >= 80 ? 'elite' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { level, score };
}

/** CI 流水线数据 */
export interface PipelineData {
  buildTimeMinutes: number;
  testCoverage: number;
  successRate: number;
}

/**
 * CI 流水线优化（纯函数）。
 *
 * @param pipeline 流水线数据
 * @returns 优化建议
 */
export function optimizeCIPipeline(pipeline: PipelineData): { suggestions: string[]; estimatedTimeReduction: number } {
  const suggestions: string[] = [];
  let reduction = 0;
  if (pipeline.buildTimeMinutes > 30) {
    suggestions.push('并行化构建步骤');
    reduction += 30;
  }
  if (pipeline.testCoverage < 0.8) {
    suggestions.push('增加单元测试覆盖率');
  }
  if (pipeline.successRate < 0.9) {
    suggestions.push('修复不稳定测试');
  }
  return { suggestions, estimatedTimeReduction: reduction };
}

/** DevOps 报告输出 */
export interface DevOpsReport {
  timeRange: string;
  code: { repos: number; lines: number; commits: number; branches: number };
  cicd: { pipelines: number; builds: number; deployments: number; successRate: number };
  integration: { lint: number; unitTests: number; integrationTests: number; securityScans: number };
  deployment: { blueGreen: number; canary: number; rolling: number; rollbacks: number };
  environment: { dev: number; staging: number; prod: number };
  artifacts: { stored: number; retentionDays: number };
  change: { approved: number; rejected: number };
  dora: { deploymentFrequency: number; leadTimeHours: number; changeFailRate: number; mttrMinutes: number; level: string; score: number };
  suggestions: string[];
}

/**
 * 构建 DevOps 报告。
 *
 * @param timeRange 时间范围
 * @returns DevOps 报告
 */
export function buildDevOpsReport(timeRange: string): DevOpsReport {
  const doraMetrics: DORAMetrics = {
    deploymentFrequency: 2,
    leadTimeHours: 12,
    changeFailRate: 0.1,
    mttrMinutes: 30,
  };
  const dora = calculateDevOpsDORA(doraMetrics);

  return {
    timeRange,
    code: { repos: 30, lines: 500000, commits: 5000, branches: 100 },
    cicd: { pipelines: 40, builds: 2000, deployments: 500, successRate: 0.95 },
    integration: { lint: 2000, unitTests: 2000, integrationTests: 500, securityScans: 100 },
    deployment: { blueGreen: 20, canary: 10, rolling: 470, rollbacks: 5 },
    environment: { dev: 2, staging: 1, prod: 1 },
    artifacts: { stored: 5000, retentionDays: 90 },
    change: { approved: 100, rejected: 5 },
    dora: { ...doraMetrics, level: dora.level, score: dora.score },
    suggestions: ['提升部署频率', '缩短变更前置时间'],
  };
}
