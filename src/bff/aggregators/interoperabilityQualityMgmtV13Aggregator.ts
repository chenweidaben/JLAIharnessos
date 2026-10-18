/**
 * 健澜科技 jlmedaios - 互联互通质量管理 V13 纯函数（M432-D，M432 收官，-quality 后缀避让旧版 interoperabilityMgmtV13（M409））
 *
 * computeInteroperabilityTestPassRateV13 / computeInteroperabilityApiSuccessRateV13 / computeInteroperabilityDataShareTimelinessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 互联互通质量管理记录 */
export interface InteroperabilityQualityMgmtRecordV13 {
  testPass: number;
  testTotal: number;
  apiSuccess: number;
  apiTotal: number;
  timelyShare: number;
  shouldShare: number;
}

/**
 * 互联互通测试通过率（纯函数）：通过测试项数/测试项总数×100，保留 2 位小数。
 *
 * @param records 互联互通质量管理记录列表
 * @returns 互联互通测试通过率百分比
 */
export function computeInteroperabilityTestPassRateV13(records: InteroperabilityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.testTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.testPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 接口调用成功率（纯函数）：成功调用次数/接口调用总次数×100，保留 2 位小数。
 *
 * @param records 互联互通质量管理记录列表
 * @returns 接口调用成功率百分比
 */
export function computeInteroperabilityApiSuccessRateV13(records: InteroperabilityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.apiTotal, 0);
  if (total === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.apiSuccess, 0);
  return Math.round((success / total) * 10000) / 100;
}

/**
 * 数据共享及时率（纯函数）：及时共享次数/应共享次数×100，保留 2 位小数。
 *
 * @param records 互联互通质量管理记录列表
 * @returns 数据共享及时率百分比
 */
export function computeInteroperabilityDataShareTimelinessRateV13(records: InteroperabilityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldShare, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyShare, 0);
  return Math.round((timely / total) * 10000) / 100;
}
