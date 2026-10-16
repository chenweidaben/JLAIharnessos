/**
 * 健澜科技 jlmedaios - 风湿免疫与过敏性疾病 V5 纯函数（M265-C）
 *
 * buildRheumatologyV5Report / scoreDAS28V5 / assessSLEDAIV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * DAS28 评分 V5（纯函数）。
 *
 * @param joints 关节
 * @param esr ESR
 * @returns DAS28
 */
export function scoreDAS28V5(joints: { tender: number; swollen: number }, esr: { value: number }): { score: number; activity: string; treatment: string } {
  const score = Math.round((0.56 * Math.sqrt(joints.tender) + 0.28 * Math.sqrt(joints.swollen) + 0.7 * Math.log(esr.value)) * 10) / 10;
  let activity = "缓解";
  let treatment = "维持DMARDs";
  if (score > 5.1) {
    activity = "高度活动";
    treatment = "生物制剂+DMARDs";
  } else if (score > 3.2) {
    activity = "中度活动";
    treatment = "调整DMARDs";
  } else if (score > 2.6) {
    activity = "低度活动";
    treatment = "维持DMARDs";
  }
  return { score, activity, treatment };
}

/**
 * SLEDAI 评估 V5（纯函数）。
 *
 * @param symptoms 症状
 * @param labs 化验
 * @returns SLEDAI
 */
export function assessSLEDAIV5(symptoms: { renal: boolean; neurologic: boolean; mucocutaneous: boolean }, labs: { complement: number; antiDsDna: number }): { score: number; severity: string; treatment: string } {
  let score = 0;
  if (symptoms.renal) score += 8;
  if (symptoms.neurologic) score += 8;
  if (symptoms.mucocutaneous) score += 4;
  if (labs.complement < 0.5) score += 4;
  if (labs.antiDsDna > 100) score += 4;
  let severity = "轻度";
  let treatment = "羟氯喹";
  if (score > 15) {
    severity = "重度";
    treatment = "激素冲击+免疫抑制剂";
  } else if (score > 5) {
    severity = "中度";
    treatment = "激素+免疫抑制剂";
  }
  return { score, severity, treatment };
}

/** 风湿免疫与过敏性疾病 V5 报告输出 */
export interface RheumatologyV5Report {
  timeRange: string;
  ra: { das28: number; jointUs: number; dmards: number; biologic: number; function: number };
  sle: { sledai: number; lupusNephritis: number; steroid: number; immunosuppressant: number; pregnancy: number };
  as: { asdas: number; spineImaging: number; biologic: number; function: number; rehab: number };
  gout: { nephroCollab: number; acuteFlare: number; urateLowering: number; diet: number; comorbidity: number };
  allergy: { rhinitis: number; asthma: number; dermatitis: number; foodAllergy: number; desensitization: number };
  autoimmune: { sjogren: number; ssc: number; myositis: number; vasculitis: number; aps: number };
  oa: { osteoporosis: number; endoCollab: number; dxa: number; analgesic: number; exercise: number };
  metrics: { das28Remission: number; relapse: number; steroidDose: number; function: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建风湿免疫与过敏性疾病 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 风湿免疫与过敏性疾病 V5 报告
 */
export function buildRheumatologyV5Report(timeRange: string): RheumatologyV5Report {
  return {
    timeRange,
    ra: { das28: 85, jointUs: 90, dmards: 95, biologic: 80, function: 75 },
    sle: { sledai: 80, lupusNephritis: 30, steroid: 90, immunosuppressant: 85, pregnancy: 60 },
    as: { asdas: 75, spineImaging: 85, biologic: 70, function: 80, rehab: 75 },
    gout: { nephroCollab: 70, acuteFlare: 200, urateLowering: 50, diet: 60, comorbidity: 70 },
    allergy: { rhinitis: 2000, asthma: 1500, dermatitis: 800, foodAllergy: 200, desensitization: 100 },
    autoimmune: { sjogren: 100, ssc: 30, myositis: 20, vasculitis: 40, aps: 20 },
    oa: { osteoporosis: 500, endoCollab: 70, dxa: 80, analgesic: 90, exercise: 75 },
    metrics: { das28Remission: 40, relapse: 10, steroidDose: 5, function: 75, satisfaction: 85 },
    suggestions: ["提升 DAS28 缓解率", "加强生物制剂规范使用"],
  };
}
