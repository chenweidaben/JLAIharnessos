/**
 * 健澜科技 jlmedaios - 个人化学习效果总览 V13 纯函数（M303-D）
 *
 * buildPersonalizedLearningOverviewV13 / computePersonalizationMaturityV13 / identifyPersonalizationGapV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生个人化学习状态 */
export interface PersonalizedDoctorV13 {
  doctorId: string;
  active: boolean;
  adoptionRate: number;
  slope: number;
  coldStart: boolean;
  plateau: boolean;
}

/** 总览 */
export interface PersonalizedLearningOverviewV13 {
  activeDoctors: number;
  avgAdoptionRate: number;
  avgSlope: number;
  plateauDoctors: number;
  coldStartDoctors: number;
}

/**
 * 汇总总览（纯函数）：均值保留1位。
 *
 * @param doctors 医生列表
 * @returns 总览
 */
export function buildPersonalizedLearningOverviewV13(
  doctors: PersonalizedDoctorV13[],
): PersonalizedLearningOverviewV13 {
  const n = doctors.length;
  if (n === 0) {
    return { activeDoctors: 0, avgAdoptionRate: 0, avgSlope: 0, plateauDoctors: 0, coldStartDoctors: 0 };
  }
  const activeDoctors = doctors.filter((d) => d.active).length;
  const plateauDoctors = doctors.filter((d) => d.plateau).length;
  const coldStartDoctors = doctors.filter((d) => d.coldStart).length;
  const sumAdoption = doctors.reduce((acc, d) => acc + d.adoptionRate, 0);
  const sumSlope = doctors.reduce((acc, d) => acc + d.slope, 0);
  return {
    activeDoctors,
    avgAdoptionRate: Math.round((sumAdoption / n) * 10) / 10,
    avgSlope: Math.round((sumSlope / n) * 10) / 10,
    plateauDoctors,
    coldStartDoctors,
  };
}

/**
 * 个人化成熟度（纯函数）：activeRatio×0.3 + adoption×0.4 + slope×0.3，0-100。
 *
 * @param overview 总览
 * @returns 成熟度分
 */
export function computePersonalizationMaturityV13(
  overview: PersonalizedLearningOverviewV13,
  totalDoctors: number,
): number {
  const activeRatio = totalDoctors === 0 ? 0 : (overview.activeDoctors / totalDoctors) * 100;
  const score =
    Math.min(100, activeRatio) * 0.3 +
    Math.min(100, overview.avgAdoptionRate) * 0.4 +
    Math.min(100, Math.max(0, overview.avgSlope)) * 0.3;
  return Math.round(score);
}

/**
 * 缺口识别（纯函数）：coldStart>10 → "新医生冷启动未覆盖"；plateau>5 → "多人学习进入平台期"。
 *
 * @param overview 总览
 * @returns 缺口描述
 */
export function identifyPersonalizationGapV13(overview: PersonalizedLearningOverviewV13): string {
  if (overview.coldStartDoctors > 10) return "新医生冷启动未覆盖";
  if (overview.plateauDoctors > 5) return "多人学习进入平台期";
  return "";
}
