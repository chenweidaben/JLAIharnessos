/**
 * 健澜科技 jlmedaios - 抗菌药物使用管理 V13 纯函数（M421-B，换名避让旧版 antiInfectionDetailV13）
 *
 * computeAntibioticUsageDDDsV13 / computeAntibioticEtiologyTestRateV13 / computeSpecialGradeAntibioticConsultRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 抗菌药物使用管理记录 */
export interface AntibioticUsageMgmtRecordV13 {
  dddsSum: number;
  etiologyTest: number;
  antibioticUse: number;
  specialConsult: number;
  specialUse: number;
}

/**
 * 抗菌药物使用强度 DDDs（纯函数，保留 2 位小数）：累计 DDDs 求和。
 *
 * @param records 抗菌药物使用管理记录列表
 * @returns 抗菌药物使用强度 DDDs（数值，保留 2 位小数）
 */
export function computeAntibioticUsageDDDsV13(records: AntibioticUsageMgmtRecordV13[]): number {
  const sum = records.reduce((acc, r) => acc + r.dddsSum, 0);
  return Math.round(sum * 100) / 100;
}

/**
 * 抗菌药物病原学送检率（纯函数）：送检例数/使用抗菌药物例数×100，保留 2 位小数。
 *
 * @param records 抗菌药物使用管理记录列表
 * @returns 抗菌药物病原学送检率百分比
 */
export function computeAntibioticEtiologyTestRateV13(records: AntibioticUsageMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.antibioticUse, 0);
  if (total === 0) return 0;
  const etiologyTest = records.reduce((acc, r) => acc + r.etiologyTest, 0);
  return Math.round((etiologyTest / total) * 10000) / 100;
}

/**
 * 特殊使用级抗菌药物会诊率（纯函数）：会诊例数/特殊使用级使用例数×100，保留 2 位小数。
 *
 * @param records 抗菌药物使用管理记录列表
 * @returns 特殊使用级抗菌药物会诊率百分比
 */
export function computeSpecialGradeAntibioticConsultRateV13(records: AntibioticUsageMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.specialUse, 0);
  if (total === 0) return 0;
  const specialConsult = records.reduce((acc, r) => acc + r.specialConsult, 0);
  return Math.round((specialConsult / total) * 10000) / 100;
}
