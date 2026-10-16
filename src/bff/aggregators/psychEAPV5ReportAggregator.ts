/**
 * 健澜科技 jlmedaios - 心理心身与 EAP V5 纯函数（M272-D）
 *
 * screenDepressionV5 / assessSuicideRiskV5 / buildPsychEAPV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 抑郁筛查 V5（纯函数，PHQ-9）。
 *
 * @param phq9 PHQ-9总分 0-27
 * @returns 筛查结果
 */
export function screenDepressionV5(phq9: number): { score: number; level: string; action: string } {
  let level = "无抑郁";
  let action = "常规";
  if (phq9 >= 20) {
    level = "重度";
    action = "精神科转介";
  } else if (phq9 >= 15) {
    level = "中重度";
    action = "心理治疗+评估";
  } else if (phq9 >= 10) {
    level = "中度";
    action = "心理咨询";
  } else if (phq9 >= 5) {
    level = "轻度";
    action = "随访";
  }
  return { score: phq9, level, action };
}

/**
 * 自杀风险评估 V5（纯函数）。
 *
 * @param items 风险因子数（意念/计划/手段/既往史/支持缺乏）
 * @returns 风险
 */
export function assessSuicideRiskV5(items: number): { risk: string; immediate: boolean; intervention: string } {
  let risk = "低";
  let immediate = false;
  let intervention = "常规随访";
  if (items >= 4) {
    risk = "极高";
    immediate = true;
    intervention = "立即危机干预+精神科";
  } else if (items >= 3) {
    risk = "高";
    immediate = true;
    intervention = "24h监护+危机干预";
  } else if (items >= 2) {
    risk = "中";
    intervention = "心理治疗+安全计划";
  }
  return { risk, immediate, intervention };
}

/** 心理心身与 EAP V5 报告输出 */
export interface PsychEAPV5Report {
  timeRange: string;
  screening: { phq9: number; gad7: number; psqi: number; pcl5: number; mdq: number; crisisEvaluation: number; referral: number };
  psychClinic: { counseling: number; therapy: number; medication: number; cbt: number; family: number; group: number };
  psychosomatic: { psychosomaticDisease: number; digestive: number; cardiovascular: number; pain: number; skin: number; chronicFatigue: number };
  eap: { staffPsych: number; stress: number; burnout: number; counseling: number; crisisIntervention: number };
  doctorPatient: { communication: number; conflictPsych: number; complaintPsych: number; patientAnxiety: number; support: number };
  crisis: { suicideRisk: number; selfHarm: number; edPsych: number; family: number; fastResponse: number; referral: number };
  education: { lecture: number; course: number; newMedia: number; mindfulness: number; meditation: number; sleep: number };
  metrics: { screeningPositiveRate: number; counselingVolume: number; crisisIntervention: number; satisfaction: number; turnoverRate: number };
  suggestions: string[];
}

/**
 * 构建心理心身与 EAP V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildPsychEAPV5Report(timeRange: string): PsychEAPV5Report {
  return {
    timeRange,
    screening: { phq9: 3000, gad7: 2500, psqi: 2000, pcl5: 300, mdq: 100, crisisEvaluation: 80, referral: 120 },
    psychClinic: { counseling: 500, therapy: 200, medication: 150, cbt: 180, family: 80, group: 60 },
    psychosomatic: { psychosomaticDisease: 400, digestive: 150, cardiovascular: 100, pain: 120, skin: 50, chronicFatigue: 80 },
    eap: { staffPsych: 500, stress: 1, burnout: 1, counseling: 200, crisisIntervention: 10 },
    doctorPatient: { communication: 1, conflictPsych: 30, complaintPsych: 20, patientAnxiety: 600, support: 1 },
    crisis: { suicideRisk: 30, selfHarm: 15, edPsych: 40, family: 25, fastResponse: 1, referral: 30 },
    education: { lecture: 20, course: 10, newMedia: 1, mindfulness: 100, meditation: 80, sleep: 200 },
    metrics: { screeningPositiveRate: 15, counselingVolume: 800, crisisIntervention: 40, satisfaction: 85, turnoverRate: 8 },
    suggestions: [
      "扩大心理筛查覆盖，早发现早干预",
      "加强EAP员工心理支持，降低职业倦怠",
      "完善危机干预快速响应机制",
    ],
  };
}
