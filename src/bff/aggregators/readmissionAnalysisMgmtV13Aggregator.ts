/**
 * 健澜科技 jlmedaios - 再入院分析管理 V13 纯函数（M427-C，换名避让旧版 readmissionMgmtV13（M411，-analysis 后缀））
 *
 * compute31DayReadmissionRateV13 / computeReadmissionCauseDistributionRateV13 / computeReadmissionInterventionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 再入院分析管理记录 */
export interface ReadmissionAnalysisMgmtRecordV13 {
  readmit31: number;
  dischargeTotal: number;
  causeChronicWorsening: number;
  interventionDone: number;
  readmitTotal: number;
}

/**
 * 31 天再入院率（纯函数）：31 天内再入院患者数/出院患者总数×100，保留 2 位小数。
 *
 * @param records 再入院分析管理记录列表
 * @returns 31 天再入院率百分比
 */
export function compute31DayReadmissionRateV13(records: ReadmissionAnalysisMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dischargeTotal, 0);
  if (total === 0) return 0;
  const readmit = records.reduce((acc, r) => acc + r.readmit31, 0);
  return Math.round((readmit / total) * 10000) / 100;
}

/**
 * 再入院原因分布率（纯函数）：慢性病加重原因再入院数/再入院总数×100，保留 2 位小数。
 *
 * @param records 再入院分析管理记录列表
 * @returns 再入院原因分布率百分比（慢性病加重占比）
 */
export function computeReadmissionCauseDistributionRateV13(records: ReadmissionAnalysisMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.readmitTotal, 0);
  if (total === 0) return 0;
  const chronic = records.reduce((acc, r) => acc + r.causeChronicWorsening, 0);
  return Math.round((chronic / total) * 10000) / 100;
}

/**
 * 再入院干预措施落实率（纯函数）：落实干预措施例数/再入院总数×100，保留 2 位小数。
 *
 * @param records 再入院分析管理记录列表
 * @returns 再入院干预措施落实率百分比
 */
export function computeReadmissionInterventionRateV13(records: ReadmissionAnalysisMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.readmitTotal, 0);
  if (total === 0) return 0;
  const done = records.reduce((acc, r) => acc + r.interventionDone, 0);
  return Math.round((done / total) * 10000) / 100;
}
