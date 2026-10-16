/**
 * 健澜科技 jlmedaios - 儿科与新生儿 V5 纯函数（M266-A）
 *
 * buildPediatricsV5Report / assessGrowthV5 / classifyNeonatalJaundiceV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 生长评估 V5（纯函数）。
 *
 * @param weight 体重
 * @param height 身高
 * @param age 年龄
 * @param sex 性别
 * @returns 生长
 */
export function assessGrowthV5(weight: { value: number }, height: { value: number }, age: { value: number }, sex: { value: string }): { status: string; percentile: string; intervention: string } {
  let percentile = "P50";
  let status = "正常";
  let intervention = "常规体检";
  if (age.value < 1) {
    percentile = weight.value < 3 ? "P3" : weight.value > 5 ? "P97" : "P50";
  } else {
    percentile = height.value < 90 ? "P3" : height.value > 120 ? "P97" : "P50";
  }
  if (percentile === "P3") {
    status = "生长迟缓";
    intervention = "营养干预+内分泌评估";
  } else if (percentile === "P97") {
    status = "超重";
    intervention = "饮食指导+运动";
  }
  return { status, percentile, intervention };
}

/**
 * 新生儿黄疸分级 V5（纯函数）。
 *
 * @param bilirubin 胆红素
 * @param ageHours 生后小时
 * @returns 黄疸
 */
export function classifyNeonatalJaundiceV5(bilirubin: { value: number }, ageHours: { value: number }): { level: string; treatment: string; risk: string } {
  let level = "生理性";
  let treatment = "光疗观察";
  let risk = "低危";
  if (ageHours.value < 24) {
    level = "病理性";
    treatment = "光疗+换血评估";
    risk = "高危";
  } else if (bilirubin.value > 256 || (ageHours.value > 48 && bilirubin.value > 205)) {
    level = "高胆红素";
    treatment = "光疗";
    risk = "中危";
  }
  if (bilirubin.value > 342) {
    treatment = "换血";
    risk = "极高危";
  }
  return { level, treatment, risk };
}

/** 儿科与新生儿 V5 报告输出 */
export interface PediatricsV5Report {
  timeRange: string;
  childHealth: { growth: number; nutrition: number; vaccine: number; devScreen: number; highRiskFollowup: number; psych: number };
  neonate: { premature: number; nicu: number; jaundice: number; resp: number; infection: number; warming: number; brainInjury: number; followup: number };
  respiratory: { pneumonia: number; asthma: number; bronchiolitis: number; recurrentRTI: number; nebulizer: number };
  digestive: { diarrhea: number; vomiting: number; constipation: number; foodAllergy: number; malnutrition: number; fluid: number };
  neuro: { epilepsy: number; cp: number; delay: number; adhd: number; autism: number };
  emergency: { febrileSeizure: number; dehydration: number; statusAsthmatic: number; asphyxia: number; poisoning: number; trauma: number };
  pharmacy: { dosing: number; liverKidney: number; interaction: number; adherence: number; parentEducation: number };
  metrics: { neonatalMortality: number; prematureComplication: number; vaccineCoverage: number; growthAchievement: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建儿科与新生儿 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 儿科与新生儿 V5 报告
 */
export function buildPediatricsV5Report(timeRange: string): PediatricsV5Report {
  return {
    timeRange,
    childHealth: { growth: 90, nutrition: 85, vaccine: 95, devScreen: 80, highRiskFollowup: 75, psych: 70 },
    neonate: { premature: 200, nicu: 150, jaundice: 300, resp: 100, infection: 80, warming: 95, brainInjury: 30, followup: 85 },
    respiratory: { pneumonia: 500, asthma: 800, bronchiolitis: 300, recurrentRTI: 200, nebulizer: 90 },
    digestive: { diarrhea: 600, vomiting: 400, constipation: 300, foodAllergy: 200, malnutrition: 50, fluid: 85 },
    neuro: { epilepsy: 100, cp: 30, delay: 150, adhd: 200, autism: 50 },
    emergency: { febrileSeizure: 200, dehydration: 150, statusAsthmatic: 30, asphyxia: 20, poisoning: 10, trauma: 100 },
    pharmacy: { dosing: 95, liverKidney: 85, interaction: 90, adherence: 75, parentEducation: 80 },
    metrics: { neonatalMortality: 2, prematureComplication: 15, vaccineCoverage: 95, growthAchievement: 85, satisfaction: 88 },
    suggestions: ["提升疫苗接种率", "加强高危儿随访"],
  };
}
