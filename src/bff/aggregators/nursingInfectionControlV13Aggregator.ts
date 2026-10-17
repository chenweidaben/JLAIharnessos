/**
 * 健澜科技 jlmedaios - 护理感控 V13 纯函数（M389-B）
 *
 * computeHandHygieneComplianceRateV13 / computeAsepticOperationQualificationRateV13 / computeCatheterRelatedInfectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理感控记录 */
export interface NursingInfectionControlRecordV13 {
  compliantCount: number;
  shouldExecuteCount: number;
  qualifiedCount: number;
  inspectCount: number;
  infectionCount: number;
  catheterDays: number;
}

/**
 * 手卫生依从率（纯函数）：依从次数/应执行次数×100，保留 2 位小数。
 *
 * @param records 护理感控记录列表
 * @returns 手卫生依从率百分比
 */
export function computeHandHygieneComplianceRateV13(records: NursingInfectionControlRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldExecuteCount, 0);
  if (should === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantCount, 0);
  return Math.round((compliant / should) * 10000) / 100;
}

/**
 * 无菌操作合格率（纯函数）：合格次数/检查次数×100，保留 2 位小数。
 *
 * @param records 护理感控记录列表
 * @returns 无菌操作合格率百分比
 */
export function computeAsepticOperationQualificationRateV13(records: NursingInfectionControlRecordV13[]): number {
  const inspect = records.reduce((acc, r) => acc + r.inspectCount, 0);
  if (inspect === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedCount, 0);
  return Math.round((qualified / inspect) * 10000) / 100;
}

/**
 * 导管相关感染率（纯函数）：感染例次/导管留置日数×1000，保留 2 位小数，千分率。
 *
 * @param records 护理感控记录列表
 * @returns 导管相关感染率千分率
 */
export function computeCatheterRelatedInfectionRateV13(records: NursingInfectionControlRecordV13[]): number {
  const days = records.reduce((acc, r) => acc + r.catheterDays, 0);
  if (days === 0) return 0;
  const infections = records.reduce((acc, r) => acc + r.infectionCount, 0);
  return Math.round((infections / days) * 100000) / 100;
}
