/**
 * 健澜科技 jlmedaios - 月子中心与产后康复 V5 纯函数（M274-B）
 *
 * assessPostpartumRecoveryV5 / monitorNewbornV5 / buildPostpartumCareV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 产后恢复评估 V5（纯函数）。
 *
 * @param mother 产妇恢复指标
 * @returns 恢复评估
 */
export function assessPostpartumRecoveryV5(mother: { wound: number; lochia: number; uterus: number; emotion: number }): { score: number; level: string } {
  const score = mother.wound + mother.lochia + mother.uterus + mother.emotion;
  let level = "良好";
  if (score < 12) {
    level = "需关注";
  } else if (score < 16) {
    level = "一般";
  }
  return { score, level };
}

/**
 * 新生儿监测 V5（纯函数）。
 *
 * @param baby 新生儿指标
 * @returns 监测结果
 */
export function monitorNewbornV5(baby: { jaundice: number; temp: number; feeding: number }): { status: string; alert: boolean } {
  let status = "正常";
  let alert = false;
  if (baby.jaundice >= 15 || baby.temp >= 38.5 || baby.feeding <= 3) {
    status = "异常";
    alert = true;
  } else if (baby.jaundice >= 10 || baby.temp >= 37.8) {
    status = "观察";
  }
  return { status, alert };
}

/** 月子中心与产后康复 V5 报告输出 */
export interface PostpartumCareV5Report {
  timeRange: string;
  admission: { roomType: number; package: number; admissionAssessment: number; motherBabyBed: number; visitation: number; safety: number };
  motherCare: { wound: number; lochia: number; uterus: number; lactation: number; emotion: number; diet: number; activity: number };
  newbornCare: { jaundice: number; feeding: number; bath: number; touch: number; monitoring: number; earlyEducation: number; vaccine: number };
  recovery: { pelvicFloor: number; rectusAbdominis: number; pelvis: number; figure: number; scar: number; herbalFumigation: number; yoga: number };
  safety: { infection: number; choking: number; jaundiceMonitoring: number; temp: number; respiration: number; emergency: number; pediatricConsult: number };
  momClass: { parenting: number; breastfeeding: number; psychology: number; nutrition: number; earlyEducation: number; familyClass: number };
  discharge: { dischargeAssessment: number; day42Review: number; followup: number; familyGuidance: number; satisfaction: number };
  metrics: { occupancyRate: number; dischargeDuration: number; infectionRate: number; complicationRate: number; repurchaseRate: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建月子中心与产后康复 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildPostpartumCareV5Report(timeRange: string): PostpartumCareV5Report {
  return {
    timeRange,
    admission: { roomType: 3, package: 5, admissionAssessment: 50, motherBabyBed: 50, visitation: 1, safety: 1 },
    motherCare: { wound: 50, lochia: 50, uterus: 50, lactation: 50, emotion: 45, diet: 50, activity: 40 },
    newbornCare: { jaundice: 50, feeding: 50, bath: 50, touch: 50, monitoring: 1, earlyEducation: 30, vaccine: 40 },
    recovery: { pelvicFloor: 40, rectusAbdominis: 35, pelvis: 30, figure: 25, scar: 20, herbalFumigation: 15, yoga: 20 },
    safety: { infection: 2, choking: 1, jaundiceMonitoring: 1, temp: 1, respiration: 1, emergency: 1, pediatricConsult: 5 },
    momClass: { parenting: 20, breastfeeding: 30, psychology: 15, nutrition: 25, earlyEducation: 20, familyClass: 10 },
    discharge: { dischargeAssessment: 50, day42Review: 45, followup: 40, familyGuidance: 50, satisfaction: 95 },
    metrics: { occupancyRate: 90, dischargeDuration: 28, infectionRate: 0.5, complicationRate: 1, repurchaseRate: 20, satisfaction: 95 },
    suggestions: [
      "加强新生儿黄疸监测",
      "推广盆底康复项目",
      "提升出所42天复查率",
    ],
  };
}
