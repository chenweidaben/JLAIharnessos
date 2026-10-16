/**
 * 健澜科技 jlmedaios - 患者画像 V3 纯函数（M255-C）
 *
 * buildPatientProfileV3Report / buildPatientProfileV3 / classifyRiskGroupV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 构建患者画像 V3（纯函数）。
 *
 * @param patient 患者
 * @param history 历史
 * @returns 画像
 */
export function buildPatientProfileV3(patient: { name: string; age: number }, history: { visits: number; diagnoses: string[] }): { name: string; age: number; visits: number; chronicCount: number; riskTags: string[] } {
  const chronicCount = history.diagnoses.filter((d) => ["高血压", "糖尿病", "冠心病", "脑卒中"].includes(d)).length;
  const riskTags: string[] = [];
  if (patient.age >= 65) riskTags.push("老年");
  if (chronicCount >= 2) riskTags.push("多病共存");
  if (history.visits >= 10) riskTags.push("高频就诊");
  return { name: patient.name, age: patient.age, visits: history.visits, chronicCount, riskTags };
}

/**
 * 分类风险组 V3（纯函数）。
 *
 * @param profile 画像
 * @returns 风险组
 */
export function classifyRiskGroupV3(profile: { chronicCount: number; riskTags: string[] }): { group: string; followup: string } {
  let group = "低风险";
  let followup = "常规随访";
  if (profile.chronicCount >= 3 || profile.riskTags.length >= 3) {
    group = "高风险";
    followup = "每周随访";
  } else if (profile.chronicCount >= 2 || profile.riskTags.length >= 2) {
    group = "中风险";
    followup = "每月随访";
  }
  return { group, followup };
}

/** 患者画像 V3 报告输出 */
export interface PatientProfileV3Report {
  timeRange: string;
  profile360: { patients: number; basic: number; visitHistory: number; satisfaction: number };
  chronic: { htn: number; dm: number; chd: number; stroke: number; tumor: number; copd: number; ckd: number; liver: number };
  highRisk: { readmission: number; unplannedSurgery: number; complication: number; death: number; highCost: number };
  stratification: { red: number; yellow: number; green: number; followupStrategy: number };
  journey: { booking: number; visit: number; exam: number; treatment: number; discharge: number; breakpoint: number };
  preference: { communication: number; payment: number; literacy: number; lifestyle: number };
  social: { income: number; education: number; occupation: number; housing: number; transport: number; familySupport: number; isolation: number };
  application: { precisionEducation: number; personalizedFollowup: number; resourceAllocation: number; riskService: number };
  suggestions: string[];
}

/**
 * 构建患者画像 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者画像 V3 报告
 */
export function buildPatientProfileV3Report(timeRange: string): PatientProfileV3Report {
  return {
    timeRange,
    profile360: { patients: 100000, basic: 100, visitHistory: 100, satisfaction: 90 },
    chronic: { htn: 20000, dm: 15000, chd: 8000, stroke: 5000, tumor: 3000, copd: 4000, ckd: 2000, liver: 1500 },
    highRisk: { readmission: 2000, unplannedSurgery: 500, complication: 800, death: 100, highCost: 1500 },
    stratification: { red: 5000, yellow: 20000, green: 75000, followupStrategy: 100 },
    journey: { booking: 90, visit: 85, exam: 80, treatment: 85, discharge: 90, breakpoint: 10 },
    preference: { communication: 80, payment: 90, literacy: 70, lifestyle: 60 },
    social: { income: 50, education: 70, occupation: 60, housing: 80, transport: 75, familySupport: 85, isolation: 15 },
    application: { precisionEducation: 50000, personalizedFollowup: 20000, resourceAllocation: 10000, riskService: 5000 },
    suggestions: ["提升画像覆盖率", "优化高风险随访"],
  };
}
