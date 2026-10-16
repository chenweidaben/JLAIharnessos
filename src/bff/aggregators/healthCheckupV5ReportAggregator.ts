/**
 * 健澜科技 jlmedaios - 健康体检中心智能化 V5 纯函数（M274-A）
 *
 * recommendCheckupV5 / interpretReportV5 / buildHealthCheckupV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 套餐推荐 V5（纯函数）。
 *
 * @param age 年龄
 * @param gender 性别
 * @param risk 风险因子数
 * @returns 推荐套餐
 */
export function recommendCheckupV5(age: number, gender: string, risk: number): { package: string; price: number; items: number } {
  let pkg = "基础套餐";
  let price = 300;
  let items = 20;
  if (age >= 50 || risk >= 3) {
    pkg = "VIP套餐";
    price = 2000;
    items = 50;
  } else if (age >= 35 || risk >= 1) {
    pkg = "精英套餐";
    price = 800;
    items = 35;
  }
  if (gender === "女" && age >= 30) {
    items += 5;
    price += 100;
  }
  return { package: pkg, price, items };
}

/**
 * AI报告解读 V5（纯函数）。
 *
 * @param results 检查异常数
 * @param history 既往异常数
 * @returns 解读
 */
export function interpretReportV5(results: number, history: number): { riskLevel: string; advice: string; followup: boolean } {
  let riskLevel = "低风险";
  let advice = "常规年度复查";
  let followup = false;
  const total = results + history;
  if (total >= 5) {
    riskLevel = "高风险";
    advice = "尽快专科就诊";
    followup = true;
  } else if (total >= 2) {
    riskLevel = "中风险";
    advice = "3月内复查";
    followup = true;
  }
  return { riskLevel, advice, followup };
}

/** 健康体检中心智能化 V5 报告输出 */
export interface HealthCheckupV5Report {
  timeRange: string;
  packageMgmt: { basic: number; elite: number; vip: number; corporate: number; onboarding: number; teacher: number; healthCert: number; customized: number };
  scheduling: { timeslot: number; corporateGroup: number; individual: number; deptCapacity: number; conflict: number; smartRecommend: number };
  inProcess: { register: number; blood: number; imaging: number; ultrasound: number; ecg: number; internalSurgical: number; route: number; efficiency: number };
  report: { summary: number; dept: number; conclusion: number; suggestion: number; aiInterpretation: number; criticalValue: number; pdf: number };
  positiveFollowup: { positiveSigns: number; retrievalRemember: number; referral: number; chronicDisease: number; closedLoop: number };
  corporateGroup: { unit: number; personnel: number; summary: number; abnormalRate: number; healthReport: number; corporateAccount: number; invoice: number };
  qa: { instrument: number; reagent: number; personnel: number; process: number; positivePrediction: number; missedDiagnosis: number; retest: number };
  metrics: { checkupVolume: number; bookingRate: number; avgDuration: number; positiveRate: number; followupRate: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建健康体检中心智能化 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildHealthCheckupV5Report(timeRange: string): HealthCheckupV5Report {
  return {
    timeRange,
    packageMgmt: { basic: 5000, elite: 2000, vip: 500, corporate: 3000, onboarding: 1000, teacher: 200, healthCert: 800, customized: 300 },
    scheduling: { timeslot: 1, corporateGroup: 30, individual: 1, deptCapacity: 1, conflict: 5, smartRecommend: 1 },
    inProcess: { register: 12000, blood: 11000, imaging: 8000, ultrasound: 9000, ecg: 7000, internalSurgical: 10000, route: 1, efficiency: 1 },
    report: { summary: 12000, dept: 12000, conclusion: 12000, suggestion: 12000, aiInterpretation: 1, criticalValue: 30, pdf: 12000 },
    positiveFollowup: { positiveSigns: 3000, retrievalRemember: 2500, referral: 500, chronicDisease: 800, closedLoop: 2000 },
    corporateGroup: { unit: 50, personnel: 5000, summary: 50, abnormalRate: 25, healthReport: 50, corporateAccount: 1, invoice: 1 },
    qa: { instrument: 1, reagent: 1, personnel: 1, process: 1, positivePrediction: 1, missedDiagnosis: 2, retest: 50 },
    metrics: { checkupVolume: 12000, bookingRate: 95, avgDuration: 90, positiveRate: 25, followupRate: 80, satisfaction: 90 },
    suggestions: [
      "提升AI报告解读覆盖率",
      "加强阳性体征随访闭环",
      "优化检中动线，缩短平均时长",
    ],
  };
}
