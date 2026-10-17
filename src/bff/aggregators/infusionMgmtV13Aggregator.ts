/**
 * 健澜科技 jlmedaios - 输液管理 V13 纯函数（M359-D，M359 收官）
 *
 * computeOutpatientInfusionRateV13 / computeInpatientAntibioticInfusionRateV13 / computeInfusionReactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 输液管理记录 */
export interface InfusionMgmtRecordV13 {
  outpatientInfusionCount: number;
  outpatientVisits: number;
  inpatientAntibioticInfusion: number;
  inpatientAntibioticUse: number;
  infusionReaction: number;
  infusionTotal: number;
}

/**
 * 门诊输液率（纯函数）：输液人次/门诊人次×100，保留 2 位小数。
 *
 * @param records 输液管理记录列表
 * @returns 门诊输液率百分比
 */
export function computeOutpatientInfusionRateV13(records: InfusionMgmtRecordV13[]): number {
  const infusion = records.reduce((acc, r) => acc + r.outpatientInfusionCount, 0);
  const visits = records.reduce((acc, r) => acc + r.outpatientVisits, 0);
  if (visits === 0) return 0;
  return Math.round((infusion / visits) * 10000) / 100;
}

/**
 * 住院抗菌药物输液率（纯函数）：抗菌药物输液人次/抗菌药物使用人次×100，保留 2 位小数。
 *
 * @param records 输液管理记录列表
 * @returns 住院抗菌药物输液率百分比
 */
export function computeInpatientAntibioticInfusionRateV13(records: InfusionMgmtRecordV13[]): number {
  const infusion = records.reduce((acc, r) => acc + r.inpatientAntibioticInfusion, 0);
  const use = records.reduce((acc, r) => acc + r.inpatientAntibioticUse, 0);
  if (use === 0) return 0;
  return Math.round((infusion / use) * 10000) / 100;
}

/**
 * 输液反应发生率（纯函数）：反应数/输液人次×100，保留 2 位小数。
 *
 * @param records 输液管理记录列表
 * @returns 输液反应发生率百分比
 */
export function computeInfusionReactionRateV13(records: InfusionMgmtRecordV13[]): number {
  const reaction = records.reduce((acc, r) => acc + r.infusionReaction, 0);
  const total = records.reduce((acc, r) => acc + r.infusionTotal, 0);
  if (total === 0) return 0;
  return Math.round((reaction / total) * 10000) / 100;
}
