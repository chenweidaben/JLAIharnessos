/**
 * 健澜科技 jlmedaios - 医院运营管理 V13 纯函数（M459-A，医院运营与健康管理组）
 *
 * 备注：M455 曾派此名但中途改规格为药品供应，旧文件已物理删除回滚；本切片按新规格重新落盘。
 *
 * computeHospitalOperationsDataReportTimelyRateV13 / computeHospitalOperationsAnalysisReportCompleteRateV13 / computeHospitalOperationsIndicatorComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医院运营管理记录 */
export interface HospitalOperationsMgmtRecordV13 {
  timely: number;
  totalReport: number;
  completed: number;
  totalAnalysisReport: number;
  qualified: number;
  totalIndicator: number;
}

/**
 * 运营数据上报及时率（纯函数）：及时上报次数/应上报总次数×100，保留 2 位小数。
 *
 * @param records 医院运营管理记录列表
 * @returns 运营数据上报及时率百分比
 */
export function computeHospitalOperationsDataReportTimelyRateV13(records: HospitalOperationsMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalReport, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 运营分析报告完成率（纯函数）：已完成分析报告数/应完成报告总数×100，保留 2 位小数。
 *
 * @param records 医院运营管理记录列表
 * @returns 运营分析报告完成率百分比
 */
export function computeHospitalOperationsAnalysisReportCompleteRateV13(records: HospitalOperationsMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAnalysisReport, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 运营指标达标率（纯函数）：达标指标数/运营指标总数×100，保留 2 位小数。
 *
 * @param records 医院运营管理记录列表
 * @returns 运营指标达标率百分比
 */
export function computeHospitalOperationsIndicatorComplianceRateV13(records: HospitalOperationsMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalIndicator, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
