/**
 * 健澜科技 jlmedaios - AI 患者陪伴 V5 纯函数（M259-C）
 *
 * buildPatientCompanionV5Report / predictAdherenceV5 / monitorChronicDiseaseV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 预测依从性 V5（纯函数）。
 *
 * @param patient 患者
 * @param regimen 方案
 * @returns 依从性
 */
export function predictAdherenceV5(patient: { education: string; age: number }, regimen: { frequency: number; duration: number }): { probability: number; risk: string; intervention: string } {
  let probability = 80;
  if (patient.education === "小学") probability -= 10;
  if (patient.age >= 65) probability -= 5;
  if (regimen.frequency > 3) probability -= 15;
  if (regimen.duration > 30) probability -= 10;
  probability = Math.max(probability, 20);
  return { probability, risk: probability < 60 ? "高风险" : "低风险", intervention: probability < 60 ? "智能提醒+药师随访" : "常规" };
}

/**
 * 监测慢病 V5（纯函数）。
 *
 * @param patient 患者
 * @param metrics 指标
 * @returns 监测
 */
export function monitorChronicDiseaseV5(patient: { condition: string }, metrics: { bp?: number; glucose?: number; hba1c?: number }): { status: string; alert: boolean; suggestion: string } {
  let alert = false;
  let status = "达标";
  let suggestion = "继续保持";
  if (patient.condition === "高血压" && metrics.bp !== undefined && metrics.bp > 140) {
    alert = true;
    status = "未达标";
    suggestion = "调整降压药";
  } else if (patient.condition === "糖尿病" && metrics.hba1c !== undefined && metrics.hba1c > 7) {
    alert = true;
    status = "未达标";
    suggestion = "调整降糖方案";
  }
  return { status, alert, suggestion };
}

/** AI 患者陪伴 V5 报告输出 */
export interface PatientCompanionV5Report {
  timeRange: string;
  chronic: { htn: number; dm: number; chd: number; medReminder: number; metricCollection: number; complicationAlert: number };
  medication: { medReminder: number; adherence: number; interaction: number; adr: number; education: number };
  emotion: { monitoring: number; meditation: number; cbt: number; counseling: number; referral: number; crisis: number };
  followup: { aiCall: number; wechat: number; survey: number; anomaly: number; human: number; satisfaction: number };
  lifestyle: { diet: number; exercise: number; sleep: number; smoking: number; alcohol: number; personalized: number };
  learning: { infographic: number; video: number; animation: number; interactive: number; progress: number; literacy: number };
  aiMetrics: { adherence: number; metricTarget: number; followupComplete: number; emotionImprove: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建 AI 患者陪伴 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns AI 患者陪伴 V5 报告
 */
export function buildPatientCompanionV5Report(timeRange: string): PatientCompanionV5Report {
  return {
    timeRange,
    chronic: { htn: 5000, dm: 3000, chd: 1000, medReminder: 90, metricCollection: 85, complicationAlert: 70 },
    medication: { medReminder: 85, adherence: 75, interaction: 90, adr: 60, education: 80 },
    emotion: { monitoring: 2000, meditation: 500, cbt: 300, counseling: 100, referral: 50, crisis: 10 },
    followup: { aiCall: 10000, wechat: 50000, survey: 5000, anomaly: 200, human: 100, satisfaction: 90 },
    lifestyle: { diet: 80, exercise: 75, sleep: 70, smoking: 60, alcohol: 65, personalized: 85 },
    learning: { infographic: 10000, video: 5000, animation: 2000, interactive: 3000, progress: 80, literacy: 75 },
    aiMetrics: { adherence: 75, metricTarget: 70, followupComplete: 90, emotionImprove: 60, satisfaction: 90 },
    suggestions: ["提升并发症预警率", "加强心理转介"],
  };
}
