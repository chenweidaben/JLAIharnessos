/**
 * 健澜科技 jlmedaios - 临床研究 RWD/RWE 平台 V5 纯函数（M269-A）
 *
 * buildRWDPlatformV5Report / designCohortV5 / assessRWDQualityV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 队列设计 V5（纯函数）。
 *
 * @param population 人群
 * @param criteria 纳排标准
 * @returns 队列
 */
export function designCohortV5(population: { total: number; ageMin: number; ageMax: number }, criteria: { include: string[]; exclude: string[] }): { cohortSize: number; eligible: number; reason: string } {
  const eligible = Math.round(population.total * 0.7);
  let reason = "符合纳排标准";
  if (eligible < population.total * 0.3) {
    reason = "符合标准者过少";
  }
  return { cohortSize: eligible, eligible, reason };
}

/**
 * 评估RWD质量 V5（纯函数）。
 *
 * @param data 数据
 * @returns 质量
 */
export function assessRWDQualityV5(data: { completeness: number; consistency: number; timeliness: number; accuracy: number }): { score: number; grade: string; usable: boolean } {
  const avg = (data.completeness + data.consistency + data.timeliness + data.accuracy) / 4;
  let grade = "B";
  if (avg >= 85) {
    grade = "A";
  } else if (avg < 60) {
    grade = "C";
  }
  const usable = avg >= 70;
  return { score: Math.round(avg), grade, usable };
}

/** 临床研究 RWD/RWE 平台 V5 报告输出 */
export interface RWDPlatformV5Report {
  timeRange: string;
  rwd: { his: number; emr: number; lis: number; pacs: number; followup: number; external: number; integration: number; standardization: number };
  design: { cohort: number; registry: number; caseControl: number; targetTrial: number; inclusion: number; exposure: number; outcome: number };
  governance: { missing: number; confounding: number; selectionBias: number; timeline: number; dictionary: number; reproducible: number };
  stats: { descriptive: number; survival: number; regression: number; propensity: number; iptw: number; sensitivity: number };
  projects: { protocol: number; ethics: number; registry: number; execution: number; output: number; paper: number; translation: number; archive: number };
  rweApplication: { insuranceDecision: number; catalog: number; guideline: number; postmarket: number; rareDisease: number };
  security: { desensitization: number; authorization: number; privacyComputation: number; neverLeave: number; audit: number };
  metrics: { projectCount: number; rwePaper: number; dataReuse: number; output: number; efficiency: number };
  suggestions: string[];
}

/**
 * 构建临床研究 RWD/RWE 平台 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns RWD/RWE 平台 V5 报告
 */
export function buildRWDPlatformV5Report(timeRange: string): RWDPlatformV5Report {
  return {
    timeRange,
    rwd: { his: 90, emr: 95, lis: 85, pacs: 80, followup: 70, external: 60, integration: 75, standardization: 70 },
    design: { cohort: 85, registry: 75, caseControl: 70, targetTrial: 60, inclusion: 80, exposure: 75, outcome: 80 },
    governance: { missing: 70, confounding: 65, selectionBias: 60, timeline: 75, dictionary: 80, reproducible: 70 },
    stats: { descriptive: 90, survival: 75, regression: 80, propensity: 65, iptw: 60, sensitivity: 70 },
    projects: { protocol: 80, ethics: 85, registry: 75, execution: 70, output: 65, paper: 55, translation: 50, archive: 80 },
    rweApplication: { insuranceDecision: 60, catalog: 55, guideline: 65, postmarket: 50, rareDisease: 45 },
    security: { desensitization: 90, authorization: 85, privacyComputation: 70, neverLeave: 95, audit: 90 },
    metrics: { projectCount: 30, rwePaper: 12, dataReuse: 60, output: 45, efficiency: 70 },
    suggestions: ["提升数据复用率", "加强研究转化"],
  };
}
