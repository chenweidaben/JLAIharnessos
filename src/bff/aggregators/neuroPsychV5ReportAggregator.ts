/**
 * 健澜科技 jlmedaios - 神经与精神心理疾病 V5 纯函数（M265-D）
 *
 * buildNeuroPsychV5Report / assessCognitionV5 / screenDepressionV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 认知评估 V5（纯函数）。
 *
 * @param mmse MMSE
 * @param moca MoCA
 * @returns 认知
 */
export function assessCognitionV5(mmse: { score: number }, moca: { score: number }): { diagnosis: string; stage: string; intervention: string } {
  let diagnosis = "正常";
  let stage = "无";
  let intervention = "认知训练";
  if (mmse.score < 24 || moca.score < 26) {
    diagnosis = "轻度认知障碍";
    stage = "MCI";
    intervention = "认知训练+随访";
  }
  if (mmse.score < 18 || moca.score < 18) {
    diagnosis = "痴呆";
    stage = "中重度";
    intervention = "药物+照护支持";
  } else if (mmse.score < 24) {
    stage = "轻度";
    intervention = "药物+认知训练";
  }
  return { diagnosis, stage, intervention };
}

/**
 * 抑郁筛查 V5（纯函数）。
 *
 * @param phq9 PHQ-9
 * @returns 抑郁
 */
export function screenDepressionV5(phq9: { score: number }): { level: string; risk: string; action: string } {
  let level = "无抑郁";
  let risk = "低危";
  let action = "健康宣教";
  if (phq9.score >= 20) {
    level = "重度抑郁";
    risk = "高危";
    action = "精神科转诊+危机干预";
  } else if (phq9.score >= 15) {
    level = "中度抑郁";
    risk = "中危";
    action = "心理治疗+药物评估";
  } else if (phq9.score >= 10) {
    level = "轻度抑郁";
    risk = "轻危";
    action = "心理治疗";
  }
  return { level, risk, action };
}

/** 神经与精神心理疾病 V5 报告输出 */
export interface NeuroPsychV5Report {
  timeRange: string;
  cerebrovascular: { strokeCenterCollab: number; tia: number; ich: number; vascularCognition: number; secondaryPrevention: number };
  epilepsy: { seizureType: number; eeg: number; med: number; surgery: number; ketogenic: number; driving: number; employment: number };
  parkinson: { updrs: number; dbs: number; motorFluctuation: number; rehab: number; nutrition: number };
  neuroimmune: { mg: number; gbs: number; ms: number; biopsy: number; immunotherapy: number; rehab: number };
  cognitive: { mmse: number; moca: number; ad: number; lbd: number; ftd: number; caregiverSupport: number };
  psych: { phq9: number; gad7: number; insomnia: number; bipolar: number; schizophrenia: number; crisis: number; psychosomatic: number; psychotherapy: number; med: number; eap: number };
  metrics: { strokeRecurrence: number; seizureControl: number; updrs: number; phq9Improvement: number; suicideRate: number };
  suggestions: string[];
}

/**
 * 构建神经与精神心理疾病 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 神经与精神心理疾病 V5 报告
 */
export function buildNeuroPsychV5Report(timeRange: string): NeuroPsychV5Report {
  return {
    timeRange,
    cerebrovascular: { strokeCenterCollab: 95, tia: 200, ich: 100, vascularCognition: 150, secondaryPrevention: 90 },
    epilepsy: { seizureType: 300, eeg: 800, med: 90, surgery: 20, ketogenic: 10, driving: 50, employment: 60 },
    parkinson: { updrs: 200, dbs: 30, motorFluctuation: 70, rehab: 75, nutrition: 80 },
    neuroimmune: { mg: 50, gbs: 20, ms: 30, biopsy: 40, immunotherapy: 85, rehab: 70 },
    cognitive: { mmse: 1000, moca: 800, ad: 200, lbd: 30, ftd: 20, caregiverSupport: 60 },
    psych: { phq9: 2000, gad7: 1500, insomnia: 1000, bipolar: 100, schizophrenia: 80, crisis: 20, psychosomatic: 300, psychotherapy: 500, med: 400, eap: 100 },
    metrics: { strokeRecurrence: 5, seizureControl: 70, updrs: 65, phq9Improvement: 60, suicideRate: 0.1 },
    suggestions: ["加强卒中二级预防", "提升抑郁筛查率"],
  };
}
