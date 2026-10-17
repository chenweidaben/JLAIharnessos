/**
 * 健澜科技 jlmedaios - 慢病管理达标率 V13 纯函数（M316-B）
 *
 * computeHypertensionControlRateV13 / computeDiabetesControlRateV13 / groupByDoctorV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 慢病患者 */
export interface ChronicPatientV13 {
  patientId: string;
  doctorId: string;
  sbp: number;
  dbp: number;
  hba1c: number;
}

/** 医生分组达标率 */
export interface DoctorControlRateV13 {
  doctorId: string;
  total: number;
  controlled: number;
  rate: number;
}

/**
 * 高血压达标率（纯函数）：SBP<140 且 DBP<90 的患者数/总患者数×100。
 *
 * @param patients 患者列表
 * @returns 达标率百分比
 */
export function computeHypertensionControlRateV13(patients: ChronicPatientV13[]): number {
  if (patients.length === 0) return 0;
  const controlled = patients.filter((p) => p.sbp < 140 && p.dbp < 90).length;
  return Math.round((controlled / patients.length) * 100);
}

/**
 * 糖尿病达标率（纯函数）：HbA1c<7% 的患者数/总患者数×100。
 *
 * @param patients 患者列表
 * @returns 达标率百分比
 */
export function computeDiabetesControlRateV13(patients: ChronicPatientV13[]): number {
  if (patients.length === 0) return 0;
  const controlled = patients.filter((p) => p.hba1c < 7).length;
  return Math.round((controlled / patients.length) * 100);
}

/**
 * 按医生分组统计达标率（纯函数，高血压达标）。
 *
 * @param patients 患者列表
 * @returns 医生分组达标率
 */
export function groupByDoctorV13(patients: ChronicPatientV13[]): DoctorControlRateV13[] {
  const byDoctor = new Map<string, ChronicPatientV13[]>();
  for (const p of patients) {
    const arr = byDoctor.get(p.doctorId) ?? [];
    arr.push(p);
    byDoctor.set(p.doctorId, arr);
  }
  return Array.from(byDoctor.entries()).map(([doctorId, list]) => {
    const controlled = list.filter((p) => p.sbp < 140 && p.dbp < 90).length;
    return {
      doctorId,
      total: list.length,
      controlled,
      rate: Math.round((controlled / list.length) * 100),
    };
  });
}
