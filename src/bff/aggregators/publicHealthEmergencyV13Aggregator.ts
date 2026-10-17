/**
 * 健澜科技 jlmedaios - 公共卫生应急 V13 纯函数（M324-D）
 *
 * computeEmergencyResponseTimeV13 / computeVaccinationCompletionRateV13 / computeChronicDiseaseCoverageV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 突发公卫事件 */
export interface EmergencyEventV13 {
  responseMinutes: number;
}

/** 疫苗接种记录 */
export interface VaccinationRecordV13 {
  isCompleted: boolean;
}

/** 慢病患者 */
export interface ChronicPatientV13 {
  isManaged: boolean;
}

/**
 * 突发公卫事件响应时长（纯函数）：均值，分钟。
 *
 * @param events 事件列表
 * @returns 平均响应时长（保留 1 位小数）
 */
export function computeEmergencyResponseTimeV13(events: EmergencyEventV13[]): number {
  if (events.length === 0) return 0;
  const sum = events.reduce((acc, e) => acc + e.responseMinutes, 0);
  return Math.round((sum / events.length) * 10) / 10;
}

/**
 * 疫苗接种完成率（纯函数）：已完成/应种×100。
 *
 * @param vaccinations 接种记录列表
 * @returns 完成率百分比
 */
export function computeVaccinationCompletionRateV13(vaccinations: VaccinationRecordV13[]): number {
  if (vaccinations.length === 0) return 0;
  const completed = vaccinations.filter((v) => v.isCompleted).length;
  return Math.round((completed / vaccinations.length) * 100);
}

/**
 * 慢性病管理覆盖率（纯函数）：已管理/总慢病×100。
 *
 * @param chronicPatients 慢病患者列表
 * @returns 覆盖率百分比
 */
export function computeChronicDiseaseCoverageV13(chronicPatients: ChronicPatientV13[]): number {
  if (chronicPatients.length === 0) return 0;
  const managed = chronicPatients.filter((p) => p.isManaged).length;
  return Math.round((managed / chronicPatients.length) * 100);
}
