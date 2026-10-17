/**
 * 健澜科技 jlmedaios - 患者个人智能体使用统计 V13 纯函数（M320-D）
 *
 * computePatientMonthlyActiveV13 / classifyPatientScenariosV13 / computeNextDayRetentionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者 MUSE 使用记录 */
export interface PatientMuseUsageV13 {
  usageId: string;
  patientId: string;
  scenario: "healthReminder" | "medicationConsult" | "reportInterpret" | "appointment";
  isNextDayReturned: boolean;
}

/** 患者场景分布 */
export interface PatientScenarioDistributionV13 {
  healthReminder: number;
  medicationConsult: number;
  reportInterpret: number;
  appointment: number;
}

/**
 * 月活患者数（纯函数）：去重患者数。
 *
 * @param usages 使用记录列表
 * @returns 月活患者数
 */
export function computePatientMonthlyActiveV13(usages: PatientMuseUsageV13[]): number {
  return new Set(usages.map((u) => u.patientId)).size;
}

/**
 * 4 场景分布（纯函数）：健康提醒/用药咨询/报告解读/预约挂号 分组计数。
 *
 * @param usages 使用记录列表
 * @returns 场景分布
 */
export function classifyPatientScenariosV13(usages: PatientMuseUsageV13[]): PatientScenarioDistributionV13 {
  const result: PatientScenarioDistributionV13 = { healthReminder: 0, medicationConsult: 0, reportInterpret: 0, appointment: 0 };
  for (const u of usages) {
    if (u.scenario === "healthReminder") result.healthReminder++;
    else if (u.scenario === "medicationConsult") result.medicationConsult++;
    else if (u.scenario === "reportInterpret") result.reportInterpret++;
    else if (u.scenario === "appointment") result.appointment++;
  }
  return result;
}

/**
 * 次日留存率（纯函数）：次日回访用户数/当日活跃用户数×100。
 *
 * @param usages 使用记录列表
 * @returns 次日留存率百分比
 */
export function computeNextDayRetentionV13(usages: PatientMuseUsageV13[]): number {
  if (usages.length === 0) return 0;
  const returned = usages.filter((u) => u.isNextDayReturned).length;
  return Math.round((returned / usages.length) * 100);
}
