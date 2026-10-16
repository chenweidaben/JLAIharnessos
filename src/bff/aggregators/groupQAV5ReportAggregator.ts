/**
 * 健澜科技 jlmedaios - 集团质控与标准统一 V5 纯函数（M273-C）
 *
 * benchmarkQualityV5 / standardizePathwayV5 / buildGroupQAV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 质控对标 V5（纯函数）。
 *
 * @param campuses 各院区质控得分
 * @returns 对标结果
 */
export function benchmarkQualityV5(campuses: { name: string; score: number }[]): { avg: number; best: string; gap: number } {
  const avg = Math.round(campuses.reduce((s, c) => s + c.score, 0) / Math.max(campuses.length, 1));
  let best = campuses[0]?.name ?? "";
  let max = campuses[0]?.score ?? 0;
  for (const c of campuses) {
    if (c.score > max) {
      max = c.score;
      best = c.name;
    }
  }
  const gap = max - avg;
  return { avg, best, gap };
}

/**
 * 统一路径 V5（纯函数）。
 *
 * @param pathway 路径名
 * @param group 是否集团统一
 * @returns 标准化结果
 */
export function standardizePathwayV5(pathway: string, group: boolean): { pathway: string; standard: string; version: string } {
  const standard = group ? "集团统一版" : "院区定制版";
  const version = group ? "v2.0" : "v1.0";
  return { pathway, standard, version };
}

/** 集团质控与标准统一 V5 报告输出 */
export interface GroupQAV5Report {
  timeRange: string;
  qaMetrics: { medicalQuality: number; nursingQuality: number; ipm: number; pharmacy: number; lab: number; imaging: number; unifiedCaliber: number };
  standards: { clinicalPathway: number; diagnosis: number; nursing: number; drugsCatalog: number; testItems: number };
  crossCampus: { quarterlyInspection: number; flyInspection: number; ranking: number; trafficLight: number; rectificationClosedLoop: number };
  training: { residency: number; cme: number; onboarding: number; exam: number; unifiedBank: number; remoteTeaching: number };
  patientSafety: { adverseEvent: number; rca: number; crossCampusSharing: number; benchmark: number };
  satisfaction: { opd: number; inpatient: number; staff: number; nps: number; crossCampusComparison: number; improvement: number };
  dataQuality: { unifiedMasterData: number; terminology: number; coding: number; empi: number; dataGovernance: number; monitoring: number };
  metrics: { unifiedComplianceRate: number; rectificationClosedLoop: number; crossCampusGap: number; bestPracticeReplication: number };
  suggestions: string[];
}

/**
 * 构建集团质控与标准统一 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildGroupQAV5Report(timeRange: string): GroupQAV5Report {
  return {
    timeRange,
    qaMetrics: { medicalQuality: 95, nursingQuality: 93, ipm: 90, pharmacy: 96, lab: 94, imaging: 92, unifiedCaliber: 1 },
    standards: { clinicalPathway: 200, diagnosis: 1, nursing: 1, drugsCatalog: 1, testItems: 1 },
    crossCampus: { quarterlyInspection: 4, flyInspection: 2, ranking: 1, trafficLight: 1, rectificationClosedLoop: 95 },
    training: { residency: 300, cme: 500, onboarding: 200, exam: 1, unifiedBank: 1, remoteTeaching: 100 },
    patientSafety: { adverseEvent: 50, rca: 30, crossCampusSharing: 1, benchmark: 1 },
    satisfaction: { opd: 88, inpatient: 90, staff: 85, nps: 40, crossCampusComparison: 1, improvement: 1 },
    dataQuality: { unifiedMasterData: 1, terminology: 1, coding: 1, empi: 1, dataGovernance: 1, monitoring: 1 },
    metrics: { unifiedComplianceRate: 92, rectificationClosedLoop: 95, crossCampusGap: 5, bestPracticeReplication: 10 },
    suggestions: [
      "缩小跨院区质控差异",
      "统一临床路径，减少变异",
      "推广最佳实践复制",
    ],
  };
}
