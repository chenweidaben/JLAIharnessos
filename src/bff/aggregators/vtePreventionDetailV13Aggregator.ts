/**
 * 健澜科技 jlmedaios - VTE 预防管理（细节）V13 纯函数（M422-A，detail 避让旧版 vtePreventionMgmtV13）
 *
 * computeVteRiskAssessmentRateV13 / computeMechanicalPreventionUsageRateV13 / computePharmaceuticalPreventionUsageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** VTE 预防管理（细节）记录 */
export interface VtePreventionDetailRecordV13 {
  assessed: number;
  shouldAssess: number;
  mechanicalUsed: number;
  pharmaceuticalUsed: number;
  highRiskTotal: number;
}

/**
 * VTE 风险评估率（纯函数）：评估患者数/应评估患者总数×100，保留 2 位小数。
 *
 * @param records VTE 预防管理（细节）记录列表
 * @returns VTE 风险评估率百分比
 */
export function computeVteRiskAssessmentRateV13(records: VtePreventionDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldAssess, 0);
  if (total === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessed, 0);
  return Math.round((assessed / total) * 10000) / 100;
}

/**
 * 机械预防使用率（纯函数）：使用机械预防患者数/高风险患者总数×100，保留 2 位小数。
 *
 * @param records VTE 预防管理（细节）记录列表
 * @returns 机械预防使用率百分比
 */
export function computeMechanicalPreventionUsageRateV13(records: VtePreventionDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.highRiskTotal, 0);
  if (total === 0) return 0;
  const mechanicalUsed = records.reduce((acc, r) => acc + r.mechanicalUsed, 0);
  return Math.round((mechanicalUsed / total) * 10000) / 100;
}

/**
 * 药物预防使用率（纯函数）：使用药物预防患者数/高风险患者总数×100，保留 2 位小数。
 *
 * @param records VTE 预防管理（细节）记录列表
 * @returns 药物预防使用率百分比
 */
export function computePharmaceuticalPreventionUsageRateV13(records: VtePreventionDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.highRiskTotal, 0);
  if (total === 0) return 0;
  const pharmaceuticalUsed = records.reduce((acc, r) => acc + r.pharmaceuticalUsed, 0);
  return Math.round((pharmaceuticalUsed / total) * 10000) / 100;
}
