/**
 * 健澜科技 jlmedaios - 护士 MUSE 工作台 V5 纯函数（M283-B）
 *
 * buildNurseDailyV5 / planRoundsV5 / flagHighRiskV5 / buildMuseNurseV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 巡视任务 */
export interface RoundTask {
  patientId: string;
  ward: string;
  scheduledHour: number;
}

/** 患者风险 */
export interface RiskPatient {
  patientId: string;
  name: string;
  fallRisk: boolean;
  pressureUlcerRisk: boolean;
  vitalAbnormal: boolean;
}

/**
 * 巡视计划 V5（纯函数）：按小时排序。
 *
 * @param tasks 巡视任务
 * @returns 排序后任务
 */
export function planRoundsV5(tasks: RoundTask[]): RoundTask[] {
  return [...tasks].sort((a, b) => a.scheduledHour - b.scheduledHour);
}

/**
 * 高风险患者标记 V5（纯函数）：跌倒/压疮/生命体征异常任一即高风险。
 *
 * @param patients 患者
 * @returns 高风险患者
 */
export function flagHighRiskV5(patients: RiskPatient[]): RiskPatient[] {
  return patients.filter((p) => p.fallRisk || p.pressureUlcerRisk || p.vitalAbnormal);
}

/**
 * 护士日工作台 V5（纯函数）。
 *
 * @param nurseId 护士ID
 * @param ward 病区
 * @param tasks 任务
 * @param patients 患者
 * @returns 工作台摘要
 */
export function buildNurseDailyV5(
  nurseId: string,
  ward: string,
  tasks: RoundTask[],
  patients: RiskPatient[],
): { nurseId: string; ward: string; totalRounds: number; highRiskCount: number } {
  const highRiskCount = flagHighRiskV5(patients).length;
  return {
    nurseId,
    ward,
    totalRounds: tasks.length,
    highRiskCount,
  };
}

/** 护士看板输出 */
export interface MuseNurseV5Report {
  totalWards: number;
  avgHighRiskPerWard: number;
}

/**
 * 构建护士看板（纯函数）。
 *
 * @param summaries 各病区摘要
 * @returns 看板
 */
export function buildMuseNurseV5Report(summaries: { highRiskCount: number }[]): MuseNurseV5Report {
  const avgHighRiskPerWard = summaries.length > 0
    ? Math.round((summaries.reduce((s, x) => s + x.highRiskCount, 0) / summaries.length) * 10) / 10
    : 0;
  return { totalWards: summaries.length, avgHighRiskPerWard };
}
