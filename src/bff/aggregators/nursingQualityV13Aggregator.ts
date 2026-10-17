/**
 * 健澜科技 jlmedaios - 护理质量 V13 纯函数（M358-A）
 *
 * computeBasicNursingPassRateV13 / computeSpecialGradeNursingPassRateV13 / computeNursingAdverseEventRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理质量记录 */
export interface NursingQualityRecordV13 {
  basicNursingPassed: number;
  basicNursingSampled: number;
  specialGradeNursingPassed: number;
  specialGradeNursingSampled: number;
  nursingAdverseEventOccurred: number;
  inpatientAdmissions: number;
}

/**
 * 基础护理合格率（纯函数）：合格数/抽查数×100，保留 2 位小数。
 *
 * @param records 护理质量记录列表
 * @returns 基础护理合格率百分比
 */
export function computeBasicNursingPassRateV13(records: NursingQualityRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.basicNursingPassed, 0);
  const sampled = records.reduce((acc, r) => acc + r.basicNursingSampled, 0);
  if (sampled === 0) return 0;
  return Math.round((passed / sampled) * 10000) / 100;
}

/**
 * 特级护理合格率（纯函数）：合格数/抽查数×100，保留 2 位小数。
 *
 * @param records 护理质量记录列表
 * @returns 特级护理合格率百分比
 */
export function computeSpecialGradeNursingPassRateV13(records: NursingQualityRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.specialGradeNursingPassed, 0);
  const sampled = records.reduce((acc, r) => acc + r.specialGradeNursingSampled, 0);
  if (sampled === 0) return 0;
  return Math.round((passed / sampled) * 10000) / 100;
}

/**
 * 护理不良事件发生率（纯函数）：发生数/住院数×100，保留 2 位小数。
 *
 * @param records 护理质量记录列表
 * @returns 护理不良事件发生率百分比
 */
export function computeNursingAdverseEventRateV13(records: NursingQualityRecordV13[]): number {
  const occurred = records.reduce((acc, r) => acc + r.nursingAdverseEventOccurred, 0);
  const admissions = records.reduce((acc, r) => acc + r.inpatientAdmissions, 0);
  if (admissions === 0) return 0;
  return Math.round((occurred / admissions) * 10000) / 100;
}
