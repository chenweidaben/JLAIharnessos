/**
 * 健澜科技 jlmedaios - Doctor MUSE 使用统计 V13 纯函数（M319-A）
 *
 * computeDoctorCallCountV13 / computeDeptCallCountV13 / classifyScenarioDistributionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** MUSE 使用记录 */
export interface MuseUsageV13 {
  usageId: string;
  doctorId: string;
  dept: string;
  scenario: "diagnosis" | "medication" | "sop";
}

/** 场景分布 */
export interface ScenarioDistributionV13 {
  diagnosis: number;
  medication: number;
  sop: number;
}

/**
 * 医生调用次数（纯函数）。
 *
 * @param usages 使用记录列表
 * @param doctorId 医生 ID
 * @returns 调用次数
 */
export function computeDoctorCallCountV13(usages: MuseUsageV13[], doctorId: string): number {
  return usages.filter((u) => u.doctorId === doctorId).length;
}

/**
 * 科室调用次数（纯函数）。
 *
 * @param usages 使用记录列表
 * @param dept 科室
 * @returns 调用次数
 */
export function computeDeptCallCountV13(usages: MuseUsageV13[], dept: string): number {
  return usages.filter((u) => u.dept === dept).length;
}

/**
 * 场景分布（纯函数）：诊断建议/用药提醒/SOP 推荐 分组计数。
 *
 * @param usages 使用记录列表
 * @returns 场景分布
 */
export function classifyScenarioDistributionV13(usages: MuseUsageV13[]): ScenarioDistributionV13 {
  const result: ScenarioDistributionV13 = { diagnosis: 0, medication: 0, sop: 0 };
  for (const u of usages) {
    if (u.scenario === "diagnosis") result.diagnosis++;
    else if (u.scenario === "medication") result.medication++;
    else if (u.scenario === "sop") result.sop++;
  }
  return result;
}
