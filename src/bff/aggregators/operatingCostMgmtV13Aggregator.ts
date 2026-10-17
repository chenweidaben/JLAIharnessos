/**
 * 健澜科技 jlmedaios - 运营成本管理 V13 纯函数（M407-A）
 *
 * computeHundredYuanMedicalRevenueMaterialCostV13 / computePersonnelExpenditureRatioV13 / computeManagementExpenseRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 运营成本管理记录 */
export interface OperatingCostMgmtRecordV13 {
  materialCost: number;
  medicalRevenue: number;
  personnelExp: number;
  totalExp: number;
  mgmtExp: number;
}

/**
 * 百元医疗收入卫生材料费（纯函数）：卫生材料费/医疗收入×100，保留 2 位小数。
 *
 * @param records 运营成本管理记录列表
 * @returns 百元医疗收入卫生材料费（元）
 */
export function computeHundredYuanMedicalRevenueMaterialCostV13(records: OperatingCostMgmtRecordV13[]): number {
  const revenue = records.reduce((acc, r) => acc + r.medicalRevenue, 0);
  if (revenue === 0) return 0;
  const material = records.reduce((acc, r) => acc + r.materialCost, 0);
  return Math.round((material / revenue) * 10000) / 100;
}

/**
 * 人员支出占比（纯函数）：人员支出/总支出×100，保留 2 位小数。
 *
 * @param records 运营成本管理记录列表
 * @returns 人员支出占比百分比
 */
export function computePersonnelExpenditureRatioV13(records: OperatingCostMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalExp, 0);
  if (total === 0) return 0;
  const personnel = records.reduce((acc, r) => acc + r.personnelExp, 0);
  return Math.round((personnel / total) * 10000) / 100;
}

/**
 * 管理费用占比（纯函数）：管理费用/总支出×100，保留 2 位小数。
 *
 * @param records 运营成本管理记录列表
 * @returns 管理费用占比百分比
 */
export function computeManagementExpenseRatioV13(records: OperatingCostMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalExp, 0);
  if (total === 0) return 0;
  const mgmt = records.reduce((acc, r) => acc + r.mgmtExp, 0);
  return Math.round((mgmt / total) * 10000) / 100;
}
