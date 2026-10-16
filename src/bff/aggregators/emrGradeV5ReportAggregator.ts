/**
 * 健澜科技 jlmedaios - 电子病历分级评价 0-8 级 V5 纯函数（M267-B）
 *
 * buildEMRGradeV5Report / assessEMRGradeV5 / planEMRGapV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 评估 EMR 等级 V5（纯函数）。
 *
 * @param capabilities 能力
 * @returns EMR 等级
 */
export function assessEMRGradeV5(capabilities: { emrAdoption: number; structured: number; closedLoop: number; cdss: number; dataGovernance: number }): { grade: number; label: string; confidence: number } {
  const avg = (capabilities.emrAdoption + capabilities.structured + capabilities.closedLoop + capabilities.cdss + capabilities.dataGovernance) / 5;
  let grade = 0;
  let label = "0级-未形成";
  if (avg >= 90) {
    grade = 8;
    label = "8级-智慧医疗";
  } else if (avg >= 80) {
    grade = 7;
    label = "7级-数据应用";
  } else if (avg >= 70) {
    grade = 6;
    label = "6级-数据治理";
  } else if (avg >= 60) {
    grade = 5;
    label = "5级-统一数据平台";
  } else if (avg >= 50) {
    grade = 4;
    label = "4级-全院信息共享";
  } else if (avg >= 40) {
    grade = 3;
    label = "3级-部门间数据交换";
  } else if (avg >= 30) {
    grade = 2;
    label = "2级-医疗数据集中";
  } else if (avg >= 20) {
    grade = 1;
    label = "1级-独立医疗信息系统";
  }
  return { grade, label, confidence: Math.round(avg) };
}

/**
 * 规划 EMR 差距整改 V5（纯函数）。
 *
 * @param current 当前
 * @param target 目标
 * @returns 差距
 */
export function planEMRGapV5(current: { grade: number }, target: { grade: number }): { gap: number; priority: string; tasks: string[] } {
  const gap = target.grade - current.grade;
  let priority = "低";
  const tasks: string[] = [];
  if (gap >= 4) {
    priority = "高";
    tasks.push("全院信息共享平台建设");
    tasks.push("闭环管理全覆盖");
  } else if (gap >= 2) {
    priority = "中";
    tasks.push("CDSS 深化应用");
    tasks.push("数据治理体系建设");
  } else if (gap >= 1) {
    priority = "低";
    tasks.push("数据质量提升");
  }
  return { gap, priority, tasks };
}

/** 电子病历分级评价 0-8 级 V5 报告输出 */
export interface EMRGradeV5Report {
  timeRange: string;
  framework: { grade: number; label: string; dataCentralization: number; workflowClosedloop: number; dataGovernance: number; smartCare: number; dataApplication: number };
  emrAdoption: { emrRate: number; structuredRate: number; closedLoopRate: number; mobileRounds: number; mobileNursing: number };
  dataQuality: { mpi: number; vocabulary: number; standard: number; completeness: number; consistency: number; timeliness: number };
  closedLoop: { order: number; transfusion: number; lab: number; radiology: number; surgery: number };
  smart: { cdss: number; imagingAI: number; recordAI: number; medRationale: number; qcAI: number };
  prep: { selfAssessment: number; gapAnalysis: number; remediation: number; evidence: number; mockReview: number };
  indicators: { req39: number; score: number; gradePredict: number; priority: number; task: number };
  postGrade: { maintenance: number; newFeature: number; rebenchmark: number; benchmark: number };
  metrics: { currentGrade: number; targetGrade: number; gap: number; readiness: number; estimatedTime: string };
  suggestions: string[];
}

/**
 * 构建电子病历分级评价 0-8 级 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 电子病历分级评价 0-8 级 V5 报告
 */
export function buildEMRGradeV5Report(timeRange: string): EMRGradeV5Report {
  return {
    timeRange,
    framework: { grade: 4, label: "4级-全院信息共享", dataCentralization: 80, workflowClosedloop: 60, dataGovernance: 50, smartCare: 40, dataApplication: 30 },
    emrAdoption: { emrRate: 90, structuredRate: 85, closedLoopRate: 65, mobileRounds: 70, mobileNursing: 75 },
    dataQuality: { mpi: 95, vocabulary: 80, standard: 85, completeness: 90, consistency: 85, timeliness: 90 },
    closedLoop: { order: 70, transfusion: 80, lab: 75, radiology: 60, surgery: 55 },
    smart: { cdss: 50, imagingAI: 40, recordAI: 30, medRationale: 60, qcAI: 45 },
    prep: { selfAssessment: 80, gapAnalysis: 70, remediation: 60, evidence: 75, mockReview: 50 },
    indicators: { req39: 35, score: 62, gradePredict: 4, priority: 12, task: 25 },
    postGrade: { maintenance: 0, newFeature: 0, rebenchmark: 0, benchmark: 0 },
    metrics: { currentGrade: 4, targetGrade: 5, gap: 1, readiness: 65, estimatedTime: "6个月" },
    suggestions: ["提升闭环管理率", "加强 CDSS 应用"],
  };
}
