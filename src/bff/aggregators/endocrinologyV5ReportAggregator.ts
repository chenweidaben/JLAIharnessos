/**
 * 健澜科技 jlmedaios - 内分泌代谢疾病管理 V5 纯函数（M264-D）
 *
 * buildEndocrinologyV5Report / classifyDiabetesV5 / assessOsteoporosisV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 糖尿病分级 V5（纯函数）。
 *
 * @param hba1c HbA1c
 * @param symptoms 症状
 * @returns 糖尿病
 */
export function classifyDiabetesV5(hba1c: { value: number }, symptoms: { hypoglycemia: boolean; complication: boolean }): { type: string; control: string; target: number } {
  let type = "2型";
  let control = "达标";
  let target = 7;
  if (hba1c.value >= 9) {
    control = "未达标";
    target = 8;
  } else if (hba1c.value >= 7) {
    control = "部分达标";
  }
  if (symptoms.hypoglycemia || symptoms.complication) {
    type = "脆性/合并症";
    target = 8;
  }
  return { type, control, target };
}

/**
 * 骨质疏松评估 V5（纯函数）。
 *
 * @param tscore T-score
 * @param priorFracture 既往骨折
 * @returns 骨质疏松
 */
export function assessOsteoporosisV5(tscore: { value: number }, priorFracture: { vertebral: boolean; hip: boolean }): { diagnosis: string; risk: string; treatment: string } {
  let diagnosis = "骨量减少";
  let risk = "中危";
  let treatment = "钙+维生素D";
  if (tscore.value <= -2.5) {
    diagnosis = "骨质疏松";
    risk = "高危";
    treatment = "抗骨松药物";
  }
  if (priorFracture.vertebral || priorFracture.hip) {
    risk = "极高危";
    treatment = "强效抗骨松+跌倒预防";
  }
  return { diagnosis, risk, treatment };
}

/** 内分泌代谢疾病管理 V5 报告输出 */
export interface EndocrinologyV5Report {
  timeRange: string;
  diabetes: { t1dm: number; t2dm: number; gdm: number; glucoseMonitoring: number; hba1c: number; complication: number; insulinPump: number };
  thyroid: { hyperthyroid: number; hypothyroid: number; nodule: number; ultrasound: number; fna: number; thyroidFunction: number; medAdjustment: number };
  obesity: { bmi: number; bodyFat: number; metabolicSurgery: number; lifestyle: number; nutrition: number; followup: number };
  lipid: { cardioCollaboration: number; target: number; med: number; adherence: number };
  gout: { acuteFlare: number; urateLowering: number; diet: number; comorbidity: number };
  osteoporosis: { dxa: number; tscore: number; calcium: number; vitaminD: number; antiOsteoporosis: number; fallPrevention: number };
  rare: { pituitary: number; cushing: number; addison: number; pheochromocytoma: number; rare: number };
  metrics: { hba1cControl: number; thyroidControl: number; weightLoss: number; fracture: number; flare: number };
  suggestions: string[];
}

/**
 * 构建内分泌代谢疾病管理 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 内分泌代谢疾病管理 V5 报告
 */
export function buildEndocrinologyV5Report(timeRange: string): EndocrinologyV5Report {
  return {
    timeRange,
    diabetes: { t1dm: 200, t2dm: 10000, gdm: 500, glucoseMonitoring: 90, hba1c: 70, complication: 20, insulinPump: 50 },
    thyroid: { hyperthyroid: 300, hypothyroid: 2000, nodule: 1000, ultrasound: 95, fna: 100, thyroidFunction: 90, medAdjustment: 85 },
    obesity: { bmi: 5000, bodyFat: 80, metabolicSurgery: 50, lifestyle: 70, nutrition: 75, followup: 65 },
    lipid: { cardioCollaboration: 80, target: 60, med: 90, adherence: 75 },
    gout: { acuteFlare: 200, urateLowering: 50, diet: 60, comorbidity: 70 },
    osteoporosis: { dxa: 800, tscore: 70, calcium: 85, vitaminD: 90, antiOsteoporosis: 50, fallPrevention: 60 },
    rare: { pituitary: 50, cushing: 10, addison: 5, pheochromocytoma: 5, rare: 100 },
    metrics: { hba1cControl: 70, thyroidControl: 85, weightLoss: 5, fracture: 10, flare: 20 },
    suggestions: ["提升 HbA1c 达标率", "加强骨质疏松筛查"],
  };
}
