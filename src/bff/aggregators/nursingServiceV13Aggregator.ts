/**
 * 健澜科技 jlmedaios - 护理服务 V13 纯函数（M376-A）
 *
 * computeBasicNursingPassRateV13 / computeSpecialNursingCountV13 / computeFirstLevelNursingCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理服务记录 */
export interface NursingServiceRecordV13 {
  basicNursingCheckCount: number;
  basicNursingPassCount: number;
  specialNursingCount: number;
  firstLevelNursingCount: number;
}

/**
 * 基础护理合格率（纯函数）：合格数/检查数×100，保留 2 位小数。
 *
 * @param records 护理服务记录列表
 * @returns 基础护理合格率百分比
 */
export function computeBasicNursingPassRateV13(records: NursingServiceRecordV13[]): number {
  const check = records.reduce((acc, r) => acc + r.basicNursingCheckCount, 0);
  if (check === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.basicNursingPassCount, 0);
  return Math.round((pass / check) * 10000) / 100;
}

/**
 * 特级护理人次（纯函数）：求和。
 *
 * @param records 护理服务记录列表
 * @returns 特级护理人次
 */
export function computeSpecialNursingCountV13(records: NursingServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.specialNursingCount, 0);
}

/**
 * 一级护理人次（纯函数）：求和。
 *
 * @param records 护理服务记录列表
 * @returns 一级护理人次
 */
export function computeFirstLevelNursingCountV13(records: NursingServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.firstLevelNursingCount, 0);
}
