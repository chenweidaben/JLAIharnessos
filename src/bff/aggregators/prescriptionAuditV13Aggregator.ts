/**
 * 健澜科技 jlmedaios - 处方点评合格率 V13 纯函数（M318-B）
 *
 * computePrescriptionPassRateV13 / classifyIrrationalTypesV13 / computeDoctorPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 处方 */
export interface PrescriptionV13 {
  prescriptionId: string;
  dept: string;
  doctorId: string;
  isPass: boolean;
  irrationalType: "indication" | "dosage" | "duplicate" | "interaction" | null;
}

/** 不合理分类 */
export interface IrrationalClassificationV13 {
  indication: number;
  dosage: number;
  duplicate: number;
  interaction: number;
}

/**
 * 科室处方合格率（纯函数）：合格处方数/总处方数×100。
 *
 * @param prescriptions 处方列表
 * @param dept 科室
 * @returns 合格率百分比
 */
export function computePrescriptionPassRateV13(prescriptions: PrescriptionV13[], dept: string): number {
  const deptPrescriptions = prescriptions.filter((p) => p.dept === dept);
  if (deptPrescriptions.length === 0) return 0;
  const pass = deptPrescriptions.filter((p) => p.isPass).length;
  return Math.round((pass / deptPrescriptions.length) * 100);
}

/**
 * 不合理处方分类（纯函数）：适应症/剂量/重复/相互作用 分组计数。
 *
 * @param prescriptions 处方列表
 * @returns 分类计数
 */
export function classifyIrrationalTypesV13(prescriptions: PrescriptionV13[]): IrrationalClassificationV13 {
  const result: IrrationalClassificationV13 = { indication: 0, dosage: 0, duplicate: 0, interaction: 0 };
  for (const p of prescriptions) {
    if (p.irrationalType === "indication") result.indication++;
    else if (p.irrationalType === "dosage") result.dosage++;
    else if (p.irrationalType === "duplicate") result.duplicate++;
    else if (p.irrationalType === "interaction") result.interaction++;
  }
  return result;
}

/**
 * 医生处方合格率（纯函数）：合格处方数/总处方数×100。
 *
 * @param prescriptions 处方列表
 * @param doctorId 医生 ID
 * @returns 合格率百分比
 */
export function computeDoctorPassRateV13(prescriptions: PrescriptionV13[], doctorId: string): number {
  const docPrescriptions = prescriptions.filter((p) => p.doctorId === doctorId);
  if (docPrescriptions.length === 0) return 0;
  const pass = docPrescriptions.filter((p) => p.isPass).length;
  return Math.round((pass / docPrescriptions.length) * 100);
}
