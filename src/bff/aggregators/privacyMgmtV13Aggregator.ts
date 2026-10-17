/**
 * 健澜科技 jlmedaios - 隐私保护管理 V13 纯函数（M425-D，M425 收官，换名避让旧版 informationSecurityMgmtV13（M419））
 *
 * computePrivacyLeakEventCountV13 / computePrivacyTrainingCoverageRateV13 / computePrivacyPolicyImplementationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 隐私保护管理记录 */
export interface PrivacyMgmtRecordV13 {
  leakEvents: number;
  trained: number;
  shouldTrain: number;
  implementedDept: number;
  shouldImplementDept: number;
}

/**
 * 患者隐私泄露事件数（纯函数）：累计事件数求和，整数。
 *
 * @param records 隐私保护管理记录列表
 * @returns 患者隐私泄露事件数（整数）
 */
export function computePrivacyLeakEventCountV13(records: PrivacyMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.leakEvents, 0);
}

/**
 * 隐私保护培训覆盖率（纯函数）：培训覆盖人数/应培训总人数×100，保留 2 位小数。
 *
 * @param records 隐私保护管理记录列表
 * @returns 隐私保护培训覆盖率百分比
 */
export function computePrivacyTrainingCoverageRateV13(records: PrivacyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTrain, 0);
  if (total === 0) return 0;
  const trained = records.reduce((acc, r) => acc + r.trained, 0);
  return Math.round((trained / total) * 10000) / 100;
}

/**
 * 隐私制度落实率（纯函数）：落实科室数/应落实科室总数×100，保留 2 位小数。
 *
 * @param records 隐私保护管理记录列表
 * @returns 隐私制度落实率百分比
 */
export function computePrivacyPolicyImplementationRateV13(records: PrivacyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldImplementDept, 0);
  if (total === 0) return 0;
  const implemented = records.reduce((acc, r) => acc + r.implementedDept, 0);
  return Math.round((implemented / total) * 10000) / 100;
}
