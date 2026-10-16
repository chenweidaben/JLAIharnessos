/**
 * 健澜科技 jlmedaios - 智慧医院三位一体评级 V5 纯函数（M267-D）
 *
 * buildSmartHospitalV5Report / assessSmartHospitalV5 / assessExperienceV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 评估智慧医院 V5（纯函数）。
 *
 * @param dimensions 维度
 * @returns 智慧医院
 */
export function assessSmartHospitalV5(dimensions: { patientSmart: number; careSmart: number; managementSmart: number }): { score: number; grade: string; level: string } {
  const avg = (dimensions.patientSmart + dimensions.careSmart + dimensions.managementSmart) / 3;
  let grade = "B";
  let level = "合格";
  if (avg >= 90) {
    grade = "A+";
    level = "国家级";
  } else if (avg >= 80) {
    grade = "A";
    level = "省级示范";
  } else if (avg >= 70) {
    grade = "B";
    level = "市级示范";
  } else if (avg >= 60) {
    grade = "C";
    level = "合格";
  } else {
    grade = "D";
    level = "待改进";
  }
  return { score: Math.round(avg), grade, level };
}

/**
 * 评估体验 V5（纯函数）。
 *
 * @param patient 患者
 * @param staff 员工
 * @returns 体验
 */
export function assessExperienceV5(patient: { score: number; nps: number }, staff: { score: number; nps: number }): { patient: number; staff: number; total: number; recommendation: string } {
  const patientAvg = (patient.score + patient.nps) / 2;
  const staffAvg = (staff.score + staff.nps) / 2;
  const total = (patientAvg + staffAvg) / 2;
  let recommendation = "持续改进";
  if (total >= 85) {
    recommendation = "标杆推广";
  } else if (total >= 75) {
    recommendation = "保持优势";
  } else if (total < 60) {
    recommendation = "专项整改";
  }
  return { patient: Math.round(patientAvg), staff: Math.round(staffAvg), total: Math.round(total), recommendation };
}

/** 智慧医院三位一体评级 V5 报告输出 */
export interface SmartHospitalV5Report {
  timeRange: string;
  triad: { patientSmart: number; careSmart: number; managementSmart: number };
  patientSmart: { internetHospital: number; selfService: number; mobilePayment: number; notification: number; satisfaction: number };
  careSmart: { cdss: number; mobileNurse: number; closedLoop: number; aiAssist: number; medRationale: number };
  managementSmart: { dashboard: number; hrp: number; performance: number; quality: number; decision: number };
  evaluation: { indicator: number; score: number; grade: string; gap: number; remediation: number };
  experience: { patient: number; staff: number; manager: number; nps: number; feedback: number };
  innovation: { g5: number; iot: number; robot: number; digitalTwin: number; aiBrain: number; showcase: number };
  postImprovement: { benchmark: number; selfReview: number; annualReview: number; iteration: number; value: number };
  metrics: { totalScore: number; grade: string; level: string; experienceScore: number; innovationCount: number };
  suggestions: string[];
}

/**
 * 构建智慧医院三位一体评级 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 智慧医院三位一体评级 V5 报告
 */
export function buildSmartHospitalV5Report(timeRange: string): SmartHospitalV5Report {
  return {
    timeRange,
    triad: { patientSmart: 80, careSmart: 75, managementSmart: 70 },
    patientSmart: { internetHospital: 85, selfService: 90, mobilePayment: 95, notification: 80, satisfaction: 88 },
    careSmart: { cdss: 60, mobileNurse: 75, closedLoop: 65, aiAssist: 50, medRationale: 70 },
    managementSmart: { dashboard: 80, hrp: 75, performance: 70, quality: 65, decision: 60 },
    evaluation: { indicator: 100, score: 75, grade: "B", gap: 10, remediation: 20 },
    experience: { patient: 88, staff: 82, manager: 85, nps: 40, feedback: 75 },
    innovation: { g5: 30, iot: 50, robot: 20, digitalTwin: 10, aiBrain: 60, showcase: 5 },
    postImprovement: { benchmark: 60, selfReview: 80, annualReview: 70, iteration: 65, value: 55 },
    metrics: { totalScore: 75, grade: "B", level: "市级示范", experienceScore: 85, innovationCount: 5 },
    suggestions: ["提升 CDSS 应用率", "加强 AI 辅助诊断"],
  };
}
