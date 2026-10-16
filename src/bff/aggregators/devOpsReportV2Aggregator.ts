/**
 * 健澜科技 jlmedaios - DevOps V2 纯函数（M216-C）
 *
 * buildDevOpsReportV2 / calculateDORA / designCIPipeline
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算 DORA 四指标（纯函数）。
 *
 * @param deploys 部署次数
 * @param leadTime 前置时间（小时）
 * @param failureRate 失败率
 * @param recoveryTime 恢复时间（小时）
 * @returns DORA 等级
 */
export function calculateDORA(deploys: number, leadTime: number, failureRate: number, recoveryTime: number): { level: string; elite: boolean } {
  const elite = deploys >= 30 && leadTime <= 1 && failureRate <= 0.1 && recoveryTime <= 1;
  let level = '中等';
  if (elite) level = '精英';
  else if (failureRate > 0.3 || recoveryTime > 24) level = '低';
  return { level, elite };
}

/** CI 阶段 */
export interface CIStage {
  name: string;
  automated: boolean;
}

/**
 * 设计 CI 流水线（纯函数）。
 *
 * @param stages 阶段
 * @returns 自动化率
 */
export function designCIPipeline(stages: CIStage[]): { automationRate: number; stages: string[] } {
  const automated = stages.filter((s) => s.automated).length;
  const automationRate = stages.length > 0 ? automated / stages.length : 0;
  return { automationRate, stages: stages.map((s) => s.name) };
}

/** DevOps V2 报告输出 */
export interface DevOpsReportV2 {
  timeRange: string;
  cicd: { pipelines: number; builds: number };
  codeQuality: { coverage: number; sonar: boolean };
  environment: { dev: number; test: number; prod: number };
  release: { deployments: number };
  test: { automation: number };
  artifact: { repository: boolean };
  iac: { terraform: boolean; ansible: boolean };
  dora: { deploys: number; leadTime: number; failureRate: number; recoveryTime: number };
  suggestions: string[];
}

/**
 * 构建 DevOps V2 报告。
 *
 * @param timeRange 时间范围
 * @returns DevOps V2 报告
 */
export function buildDevOpsReportV2(timeRange: string): DevOpsReportV2 {
  return {
    timeRange,
    cicd: { pipelines: 20, builds: 1000 },
    codeQuality: { coverage: 0.85, sonar: true },
    environment: { dev: 3, test: 2, prod: 1 },
    release: { deployments: 100 },
    test: { automation: 80 },
    artifact: { repository: true },
    iac: { terraform: true, ansible: true },
    dora: { deploys: 30, leadTime: 0.5, failureRate: 0.08, recoveryTime: 0.5 },
    suggestions: ['提高测试自动化率', '缩短前置时间'],
  };
}
