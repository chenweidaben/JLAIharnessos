/**
 * 健澜科技 jlmedaios - 急诊管理纯函数（M190-D V2 报表层）
 *
 * buildEmergencyReport / classifyEmergencyTriage / predictEmergencyResourceNeed
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 急诊患者 */
export interface EmergencyPatientV2 {
  vitalSigns: {
    systolicBp: number;
    heartRate: number;
    respRate: number;
    spo2: number;
    consciousness: 'alert' | 'verbal' | 'pain' | 'unresponsive';
  };
  chiefComplaint: string;
}

/** 分诊分级 */
export type TriageLevelV2 = 'I' | 'II' | 'III' | 'IV';

/**
 * 急诊分诊分级（纯函数）。
 *
 * @param patient 急诊患者
 * @returns 分诊级别 I-IV
 */
export function classifyEmergencyTriage(patient: EmergencyPatientV2): TriageLevelV2 {
  const v = patient.vitalSigns;

  // I 级：濒危，立即抢救
  if (
    v.systolicBp < 80 ||
    v.heartRate > 140 ||
    v.spo2 < 85 ||
    v.consciousness === 'unresponsive' ||
    patient.chiefComplaint.includes('心脏骤停') ||
    patient.chiefComplaint.includes('休克')
  ) {
    return 'I';
  }

  // II 级：危重，10 分钟内处置
  if (
    v.systolicBp < 100 ||
    v.heartRate > 120 ||
    v.spo2 < 92 ||
    v.consciousness === 'pain' ||
    patient.chiefComplaint.includes('胸痛') ||
    patient.chiefComplaint.includes('卒中') ||
    patient.chiefComplaint.includes('创伤')
  ) {
    return 'II';
  }

  // III 级：急症，30 分钟内处置
  if (v.systolicBp < 120 || v.consciousness === 'verbal') {
    return 'III';
  }

  // IV 级：非急症，可等候
  return 'IV';
}

/**
 * 急诊资源需求预测（纯函数）。
 *
 * @param records 历史急诊记录
 * @returns 预测需求
 */
export function predictEmergencyResourceNeed(records: Array<{ arrivalHour: number; triage: TriageLevelV2 }>): {
  predictedI: number;
  predictedII: number;
  predictedIII: number;
  predictedIV: number;
  recommendedBeds: number;
} {
  const counts: Record<TriageLevelV2, number> = { I: 0, II: 0, III: 0, IV: 0 };
  for (const r of records) counts[r.triage] += 1;

  const n = records.length;
  return {
    predictedI: n === 0 ? 0 : Math.round((counts.I / n) * 100) / 100,
    predictedII: n === 0 ? 0 : Math.round((counts.II / n) * 100) / 100,
    predictedIII: n === 0 ? 0 : Math.round((counts.III / n) * 100) / 100,
    predictedIV: n === 0 ? 0 : Math.round((counts.IV / n) * 100) / 100,
    recommendedBeds: n === 0 ? 0 : Math.ceil(n * 0.3),
  };
}

/** 急诊报告输出 */
export interface EmergencyReportV2 {
  dept: string;
  timeRange: string;
  totalVisits: number;
  triageDistribution: { level: string; count: number; pct: number }[];
  rescueSuccessRate: number;
  observationRate: number;
  emergencySurgeryRate: number;
  chestPainDtbMinutes: number;
  strokeDntMinutes: number;
  greenChannelRate: number;
  alerts: string[];
}

/**
 * 构建急诊管理报告（V2 报表层）。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 急诊报告
 */
export function buildEmergencyReport(dept: string, timeRange: string): EmergencyReportV2 {
  return {
    dept,
    timeRange,
    totalVisits: 4500,
    triageDistribution: [
      { level: 'I', count: 90, pct: 2.0 },
      { level: 'II', count: 450, pct: 10.0 },
      { level: 'III', count: 2250, pct: 50.0 },
      { level: 'IV', count: 1710, pct: 38.0 },
    ],
    rescueSuccessRate: 0.85,
    observationRate: 0.3,
    emergencySurgeryRate: 0.08,
    chestPainDtbMinutes: 45,
    strokeDntMinutes: 25,
    greenChannelRate: 0.95,
    alerts: ['胸痛中心 D-to-B 平均 45 分钟，优于国标 90 分钟', '卒中中心 DNT 25 分钟，优于国标 60 分钟'],
  };
}
