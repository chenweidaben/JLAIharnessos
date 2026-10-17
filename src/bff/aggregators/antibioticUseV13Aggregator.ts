/**
 * 健澜科技 jlmedaios - 抗菌药物使用强度 V13 纯函数（M333-C）
 *
 * computeAntibioticDDDsPerBedDayV13 / computeAntibioticComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 抗菌药物使用记录 */
export interface AntibioticUseRecordV13 {
  ddds: number;
  inpatientDays: number;
  totalUseCount: number;
  compliantUseCount: number;
}

/**
 * DDDs/住院天（纯函数）：总DDDs/总住院天数，保留 2 位小数。
 *
 * @param records 使用记录列表
 * @returns DDDs/住院天
 */
export function computeAntibioticDDDsPerBedDayV13(records: AntibioticUseRecordV13[]): number {
  const totalDdds = records.reduce((acc, r) => acc + r.ddds, 0);
  const totalDays = records.reduce((acc, r) => acc + r.inpatientDays, 0);
  if (totalDays === 0) return 0;
  return Math.round((totalDdds / totalDays) * 100) / 100;
}

/**
 * 合格率（纯函数）：合理使用数/总使用数×100。
 *
 * @param records 使用记录列表
 * @returns 合格率百分比
 */
export function computeAntibioticComplianceRateV13(records: AntibioticUseRecordV13[]): number {
  const totalUse = records.reduce((acc, r) => acc + r.totalUseCount, 0);
  const compliantUse = records.reduce((acc, r) => acc + r.compliantUseCount, 0);
  if (totalUse === 0) return 0;
  return Math.round((compliantUse / totalUse) * 100);
}
