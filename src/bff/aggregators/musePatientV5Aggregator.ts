/**
 * 健澜科技 jlmedaios - 患者 MUSE 助手 V5 纯函数（M284-A）
 *
 * buildPatientMUSEV5 / answerPatientV5 / nudgePatientV5 / buildMusePatientV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者上下文 */
export interface PatientContext {
  patientRef: string;
  channel: string;
  upcomingVisits: number;
  pendingReports: number;
  chronicDiseases: string[];
}

/**
 * 患者助手构建 V5（纯函数）：根据上下文生成首屏摘要。
 *
 * @param ctx 患者上下文
 * @returns 首屏摘要
 */
export function buildPatientMUSEV5(ctx: PatientContext): { summary: string; nextAction: string } {
  let summary = `您好，您有 ${ctx.upcomingVisits} 个待就诊预约，${ctx.pendingReports} 份待查看报告。`;
  let nextAction = "查看今日预约";
  if (ctx.pendingReports > 0) {
    nextAction = "先查看报告解读";
  } else if (ctx.chronicDiseases.length > 0) {
    nextAction = "记录今日用药打卡";
  }
  return { summary, nextAction };
}

/**
 * 患者问答 V5（纯函数）：基于知识库返回答案。
 *
 * @param question 问题
 * @param knowledge 知识库字典
 * @returns 答案
 */
export function answerPatientV5(question: string, knowledge: Record<string, string>): { answer: string; found: boolean } {
  for (const [key, value] of Object.entries(knowledge)) {
    if (question.includes(key)) {
      return { answer: value, found: true };
    }
  }
  return { answer: "这个问题我已记录，将由专科医生回复您。", found: false };
}

/**
 * 患者提醒 V5（纯函数）：根据治疗计划生成提醒。
 *
 * @param patient 患者上下文
 * @param plan 计划描述
 * @returns 提醒列表
 */
export function nudgePatientV5(patient: PatientContext, plan: string): { message: string; priority: "low" | "medium" | "high" }[] {
  const nudges: { message: string; priority: "low" | "medium" | "high" }[] = [];
  if (patient.pendingReports > 0) {
    nudges.push({ message: `您有 ${patient.pendingReports} 份报告待解读`, priority: "high" });
  }
  if (patient.upcomingVisits > 0) {
    nudges.push({ message: `请按时参加 ${patient.upcomingVisits} 个预约`, priority: "medium" });
  }
  if (patient.chronicDiseases.length > 0) {
    nudges.push({ message: `坚持治疗计划：${plan}`, priority: "low" });
  }
  return nudges;
}

/** 患者 MUSE 看板输出 */
export interface MusePatientV5Report {
  totalPatients: number;
  avgPendingReports: number;
}

/**
 * 构建患者 MUSE 看板（纯函数）。
 *
 * @param patients 患者上下文列表
 * @returns 看板
 */
export function buildMusePatientV5Report(patients: PatientContext[]): MusePatientV5Report {
  const totalReports = patients.reduce((s, p) => s + p.pendingReports, 0);
  const avgPendingReports = patients.length > 0
    ? Math.round((totalReports / patients.length) * 10) / 10
    : 0;
  return { totalPatients: patients.length, avgPendingReports };
}
