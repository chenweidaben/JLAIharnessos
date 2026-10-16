/**
 * 健澜科技 jlmedaios - AI 门诊全流程闭环 V5 纯函数（M258-A）
 *
 * buildOutpatientAIClosedLoopV5Report / predictNoShowV5 / routePatientToDepartmentV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 预测爽约 V5（纯函数）。
 *
 * @param appointment 预约
 * @param history 历史
 * @returns 爽约
 */
export function predictNoShowV5(appointment: { time: string; channel: string }, history: { noShowRate: number }): { probability: number; alert: boolean; suggest: string } {
  let probability = history.noShowRate;
  if (appointment.channel === "walk-in") probability += 10;
  if (appointment.time.includes("周一")) probability += 5;
  probability = Math.min(probability, 95);
  return { probability, alert: probability >= 30, suggest: probability >= 30 ? "提前短信提醒" : "常规" };
}

/**
 * 导诊患者到科室 V5（纯函数）。
 *
 * @param symptoms 症状
 * @param depts 科室
 * @returns 导诊
 */
export function routePatientToDepartmentV5(symptoms: string[], depts: string[]): { department: string; confidence: number; alternatives: string[] } {
  let department = "全科";
  let confidence = 50;
  if (symptoms.includes("头痛") || symptoms.includes("头晕")) {
    department = "神经内科";
    confidence = 85;
  } else if (symptoms.includes("胸痛") || symptoms.includes("胸闷")) {
    department = "心血管内科";
    confidence = 90;
  } else if (symptoms.includes("腹痛") || symptoms.includes("腹泻")) {
    department = "消化内科";
    confidence = 80;
  }
  const alternatives = depts.filter((d) => d !== department).slice(0, 2);
  return { department, confidence, alternatives };
}

/** AI 门诊全流程闭环 V5 报告输出 */
export interface OutpatientAIClosedLoopV5Report {
  timeRange: string;
  preConsult: { preTriage: number; smartBooking: number; timeSlot: number; prep: number; reminder: number; transport: number };
  inVisit: { smartTriage: number; aiGuide: number; doctorStation: number; settle: number; mobilePay: number };
  postConsult: { reportInterpret: number; medGuide: number; rebook: number; followup: number; satisfaction: number };
  quality: { waitTime: number; revisitRate: number; rxRational: number; examPositive: number; complaint: number };
  aiMetrics: { preconsultAdoption: number; triageAccuracy: number; guideResolution: number; loopComplete: number };
  suggestions: string[];
}

/**
 * 构建 AI 门诊全流程闭环 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns AI 门诊全流程闭环 V5 报告
 */
export function buildOutpatientAIClosedLoopV5Report(timeRange: string): OutpatientAIClosedLoopV5Report {
  return {
    timeRange,
    preConsult: { preTriage: 50000, smartBooking: 80, timeSlot: 90, prep: 85, reminder: 95, transport: 70 },
    inVisit: { smartTriage: 90, aiGuide: 10000, doctorStation: 50000, settle: 95, mobilePay: 80 },
    postConsult: { reportInterpret: 30000, medGuide: 20000, rebook: 10000, followup: 15000, satisfaction: 92 },
    quality: { waitTime: 15, revisitRate: 30, rxRational: 98, examPositive: 45, complaint: 0.5 },
    aiMetrics: { preconsultAdoption: 85, triageAccuracy: 92, guideResolution: 75, loopComplete: 80 },
    suggestions: ["提升预问诊采纳率", "缩短候诊时长"],
  };
}
