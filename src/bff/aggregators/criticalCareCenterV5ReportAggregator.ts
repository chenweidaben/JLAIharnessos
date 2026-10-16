/**
 * 健澜科技 jlmedaios - 危重症中心智能化 V5 纯函数（M263-D）
 *
 * buildCriticalCareCenterV5Report / calculateAPACHEIIV5 / assessSepsisBundleV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * APACHE II 评分 V5（纯函数）。
 *
 * @param vitals 生命体征
 * @param labs 化验
 * @param age 年龄
 * @returns APACHE II
 */
export function calculateAPACHEIIV5(vitals: { temp: number; map: number; hr: number; rr: number }, labs: { ph: number; sodium: number; potassium: number; creatinine: number }, age: number): { score: number; mortality: string; level: string } {
  let score = 0;
  if (vitals.temp >= 39 || vitals.temp <= 35) score += 3;
  if (vitals.map >= 140 || vitals.map <= 50) score += 4;
  if (vitals.hr >= 140 || vitals.hr <= 40) score += 3;
  if (vitals.rr >= 50 || vitals.rr <= 10) score += 3;
  if (labs.ph < 7.3 || labs.ph >= 7.6) score += 3;
  if (labs.sodium >= 160 || labs.sodium <= 120) score += 2;
  if (labs.creatinine >= 2) score += 2;
  if (age >= 75) score += 6;
  else if (age >= 65) score += 5;
  let mortality = "低危";
  let level = "普通 ICU";
  if (score >= 25) {
    mortality = "高危";
    level = "综合 ICU";
  } else if (score >= 15) {
    mortality = "中危";
    level = "专科 ICU";
  }
  return { score, mortality, level };
}

/**
 * 评估脓毒症 1 小时 Bundle V5（纯函数）。
 *
 * @param hour1 1小时内执行项
 * @returns Bundle
 */
export function assessSepsisBundleV5(hour1: { lactate: boolean; bloodCulture: boolean; antibiotic: boolean; fluid: boolean; sourceControl: boolean }): { compliant: boolean; items: number; missing: string[] } {
  let items = 0;
  const missing: string[] = [];
  if (hour1.lactate) items++; else missing.push("测乳酸");
  if (hour1.bloodCulture) items++; else missing.push("血培养");
  if (hour1.antibiotic) items++; else missing.push("用抗生素");
  if (hour1.fluid) items++; else missing.push("液体复苏");
  if (hour1.sourceControl) items++; else missing.push("源控制");
  const compliant = items >= 4;
  return { compliant, items, missing };
}

/** 危重症中心智能化 V5 报告输出 */
export interface CriticalCareCenterV5Report {
  timeRange: string;
  admission: { apache: number; sofa: number; mrc: number; admissionCriteria: number; dischargeCriteria: number };
  organSupport: { respiratory: number; circulation: number; kidney: number; crrt: number; liver: number; nutrition: number; glucose: number; ecmo: number };
  monitoring: { invasiveBP: number; cvp: number; svo2: number; picco: number; us: number; icp: number; eeg: number };
  sepsis: { bundle: number; lactate: number; bloodCulture: number; antibiotic: number; sourceControl: number };
  sedation: { rass: number; cam: number; delirium: number; dailyWake: number; earlyMobility: number };
  postICU: { pics: number; followup: number; rehab: number; familySupport: number };
  quality: { vap: number; clabsi: number; cauti: number; reICU: number; mortality: number; los: number; cost: number };
  ai: { deterioration: number; sepsisAlert: number; weaning: number; resource: number };
  metrics: { mortality: number; los: number; reICU: number; vap: number };
  suggestions: string[];
}

/**
 * 构建危重症中心智能化 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 危重症中心智能化 V5 报告
 */
export function buildCriticalCareCenterV5Report(timeRange: string): CriticalCareCenterV5Report {
  return {
    timeRange,
    admission: { apache: 18, sofa: 8, mrc: 60, admissionCriteria: 95, dischargeCriteria: 90 },
    organSupport: { respiratory: 80, circulation: 60, kidney: 30, crrt: 15, liver: 10, nutrition: 90, glucose: 95, ecmo: 3 },
    monitoring: { invasiveBP: 100, cvp: 70, svo2: 40, picco: 20, us: 85, icp: 10, eeg: 15 },
    sepsis: { bundle: 85, lactate: 95, bloodCulture: 98, antibiotic: 90, sourceControl: 75 },
    sedation: { rass: 90, cam: 85, delirium: 20, dailyWake: 80, earlyMobility: 70 },
    postICU: { pics: 30, followup: 60, rehab: 50, familySupport: 75 },
    quality: { vap: 5, clabsi: 3, cauti: 4, reICU: 5, mortality: 15, los: 8, cost: 50000 },
    ai: { deterioration: 88, sepsisAlert: 92, weaning: 85, resource: 80 },
    metrics: { mortality: 15, los: 8, reICU: 5, vap: 5 },
    suggestions: ["提升 1h Bundle 依从性", "加强早期活动"],
  };
}
