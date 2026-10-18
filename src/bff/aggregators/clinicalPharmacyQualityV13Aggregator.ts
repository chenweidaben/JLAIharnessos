/**
 * 健澜科技 jlmedaios - 临床药学服务质量管理 V13 纯函数（M440-D，M440 收官，药事管理与药学服务组）
 *
 * computeClinicalPharmacyRoundParticipationRateV13 / computeClinicalPharmacyOrderReviewRateV13 / computeClinicalPharmacyMonitoringCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床药学服务质量管理记录 */
export interface ClinicalPharmacyQualityRecordV13 {
  participatedRound: number;
  shouldParticipate: number;
  reviewedOrder: number;
  totalOrder: number;
  monitoredPatient: number;
  shouldMonitor: number;
}

/**
 * 临床药师参与查房率（纯函数）：临床药师参与查房次数/应参与查房总次数×100，保留 2 位小数。
 *
 * @param records 临床药学服务质量管理记录列表
 * @returns 临床药师参与查房率百分比
 */
export function computeClinicalPharmacyRoundParticipationRateV13(records: ClinicalPharmacyQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldParticipate, 0);
  if (total === 0) return 0;
  const participated = records.reduce((acc, r) => acc + r.participatedRound, 0);
  return Math.round((participated / total) * 10000) / 100;
}

/**
 * 用药医嘱审核率（纯函数）：已审核用药医嘱数/用药医嘱总数×100，保留 2 位小数。
 *
 * @param records 临床药学服务质量管理记录列表
 * @returns 用药医嘱审核率百分比
 */
export function computeClinicalPharmacyOrderReviewRateV13(records: ClinicalPharmacyQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalOrder, 0);
  if (total === 0) return 0;
  const reviewed = records.reduce((acc, r) => acc + r.reviewedOrder, 0);
  return Math.round((reviewed / total) * 10000) / 100;
}

/**
 * 药学监护覆盖率（纯函数）：已开展药学监护患者数/应监护患者总数×100，保留 2 位小数。
 *
 * @param records 临床药学服务质量管理记录列表
 * @returns 药学监护覆盖率百分比
 */
export function computeClinicalPharmacyMonitoringCoverageRateV13(records: ClinicalPharmacyQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldMonitor, 0);
  if (total === 0) return 0;
  const monitored = records.reduce((acc, r) => acc + r.monitoredPatient, 0);
  return Math.round((monitored / total) * 10000) / 100;
}
