/**
 * 健澜科技 jlmedaios - 临床营养与膳食治疗 V5 纯函数（M272-C）
 *
 * screenNutritionV5 / prescribeEnteralV5 / buildClinicalNutritionV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 营养筛查 V5（纯函数）。
 *
 * @param nrs NRS-2002评分
 * @param bmi BMI
 * @param intake 摄入占比(%)
 * @returns 筛查结果
 */
export function screenNutritionV5(nrs: number, bmi: number, intake: number): { atRisk: boolean; level: string; action: string } {
  let atRisk = false;
  let level = "正常";
  let action = "常规膳食";
  if (nrs >= 5 || bmi < 18.5 || intake < 60) {
    atRisk = true;
    level = "高风险";
    action = "营养会诊+支持";
  } else if (nrs >= 3 || bmi < 20 || intake < 75) {
    atRisk = true;
    level = "潜在风险";
    action = "营养咨询";
  }
  return { atRisk, level, action };
}

/**
 * 肠内营养处方 V5（纯函数）。
 *
 * @param patient 患者
 * @param route 途径
 * @returns 处方
 */
export function prescribeEnteralV5(patient: string, route: "ons" | "nasogastric" | "peg"): { patient: string; formula: string; rate: string } {
  let formula = "整蛋白型";
  let rate = "50ml/h";
  if (route === "nasogastric") {
    formula = "整蛋白/短肽型";
    rate = "30ml/h起始";
  } else if (route === "peg") {
    formula = "疾病特殊型";
    rate = "80ml/h";
  }
  return { patient, formula, rate };
}

/** 临床营养与膳食治疗 V5 报告输出 */
export interface ClinicalNutritionV5Report {
  timeRange: string;
  screening: { nrs2002: number; mna: number; glim: number; malnutritionRisk: number; nutritionConsult: number };
  dietary: { diabetic: number; nephropathy: number; gout: number; lowSaltLowFat: number; tubeFeeding: number; therapeuticDiet: number };
  enteral: { ons: number; tubeFeeding: number; formula: number; infusion: number; rate: number; temperature: number; tolerance: number; complication: number };
  parenteral: { cvc: number; pvc: number; formula: number; calorieNitrogen: number; monitoring: number; complication: number };
  dept: { dietitian: number; dietPrescription: number; cafeteria: number; therapeuticMeal: number; delivery: number; quality: number };
  special: { oncology: number; elderly: number; pediatric: number; maternity: number; icu: number; prePostop: number };
  weight: { weightLoss: number; weightGain: number; bariatric: number; exercise: number; diet: number; followup: number };
  metrics: { malnutritionRate: number; nutritionInterventionRate: number; calorieTarget: number; complication: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建临床营养与膳食治疗 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildClinicalNutritionV5Report(timeRange: string): ClinicalNutritionV5Report {
  return {
    timeRange,
    screening: { nrs2002: 2000, mna: 300, glim: 200, malnutritionRisk: 400, nutritionConsult: 250 },
    dietary: { diabetic: 300, nephropathy: 150, gout: 80, lowSaltLowFat: 500, tubeFeeding: 120, therapeuticDiet: 1200 },
    enteral: { ons: 300, tubeFeeding: 120, formula: 1, infusion: 1, rate: 1, temperature: 1, tolerance: 1, complication: 5 },
    parenteral: { cvc: 80, pvc: 40, formula: 1, calorieNitrogen: 1, monitoring: 1, complication: 8 },
    dept: { dietitian: 15, dietPrescription: 1500, cafeteria: 1, therapeuticMeal: 1200, delivery: 1, quality: 1 },
    special: { oncology: 200, elderly: 400, pediatric: 100, maternity: 80, icu: 150, prePostop: 300 },
    weight: { weightLoss: 100, weightGain: 30, bariatric: 10, exercise: 1, diet: 1, followup: 150 },
    metrics: { malnutritionRate: 20, nutritionInterventionRate: 85, calorieTarget: 75, complication: 3, satisfaction: 86 },
    suggestions: [
      "推广NRS-2002常规筛查，早期干预",
      "优化肠内营养耐受性，减少并发症",
      "加强治疗膳食配送质量",
    ],
  };
}
