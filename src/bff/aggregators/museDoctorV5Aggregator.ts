/**
 * 健澜科技 jlmedaios - 医生 MUSE 工作台 V5 纯函数（M283-A）
 *
 * buildDoctorDailyV5 / prioritizePatientsV5 / suggestExperienceV5 / buildMuseDoctorV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者 */
export interface WardPatient {
  patientId: string;
  name: string;
  severity: number;
  lastRoundHoursAgo: number;
  pendingTests: number;
}

/** AI 建议 */
export interface Advice {
  patientId: string;
  type: string;
  confidence: number;
}

/**
 * 患者优先级排序 V5（纯函数）：severity 高 + 距上次巡视久者优先。
 *
 * @param patients 患者列表
 * @returns 排序后患者
 */
export function prioritizePatientsV5(patients: WardPatient[]): WardPatient[] {
  return [...patients].sort((a, b) => {
    const scoreA = a.severity * 10 + a.lastRoundHoursAgo;
    const scoreB = b.severity * 10 + b.lastRoundHoursAgo;
    return scoreB - scoreA;
  });
}

/**
 * 经验提醒 V5（纯函数）：根据上下文返回同类病例经验。
 *
 * @param context 诊断上下文
 * @returns 提醒列表
 */
export function suggestExperienceV5(context: { diagnosis: string; department: string }): string[] {
  const tips: string[] = [];
  if (context.diagnosis.includes("心梗")) {
    tips.push("心梗患者双抗后24h内避免有创操作（历史经验）");
  }
  if (context.diagnosis.includes("肺炎")) {
    tips.push("老年肺炎易合并电解质紊乱，注意监测（历史经验）");
  }
  return tips;
}

/**
 * 医生日工作台 V5（纯函数）。
 *
 * @param doctorId 医生ID
 * @param patients 在院患者
 * @param advices AI 建议
 * @returns 工作台摘要
 */
export function buildDoctorDailyV5(
  doctorId: string,
  patients: WardPatient[],
  advices: Advice[],
): { doctorId: string; pendingCount: number; highSeverityCount: number; topPatient: WardPatient | null; adviceCount: number } {
  const sorted = prioritizePatientsV5(patients);
  const highSeverityCount = patients.filter((p) => p.severity >= 8).length;
  return {
    doctorId,
    pendingCount: patients.length,
    highSeverityCount,
    topPatient: sorted[0] ?? null,
    adviceCount: advices.length,
  };
}

/** MUSE 医生看板输出 */
export interface MuseDoctorV5Report {
  totalDoctors: number;
  avgHighSeverityPerDoctor: number;
}

/**
 * 构建 MUSE 医生看板（纯函数）。
 *
 * @param summaries 各医生工作台摘要
 * @returns 看板
 */
export function buildMuseDoctorV5Report(summaries: { highSeverityCount: number }[]): MuseDoctorV5Report {
  const avgHighSeverityPerDoctor = summaries.length > 0
    ? Math.round((summaries.reduce((s, x) => s + x.highSeverityCount, 0) / summaries.length) * 10) / 10
    : 0;
  return { totalDoctors: summaries.length, avgHighSeverityPerDoctor };
}
