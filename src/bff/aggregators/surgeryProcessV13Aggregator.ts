/**
 * 健澜科技 jlmedaios - 手术过程 V13 纯函数（M391-A）
 *
 * computeSurgeryOnTimeStartRateV13 / computeSurgeryOnTimeEndRateV13 / computeIntraoperativeAdverseEventCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术过程记录 */
export interface SurgeryProcessRecordV13 {
  onTimeStartCount: number;
  onTimeEndCount: number;
  surgeryTotalCount: number;
  adverseEventCount: number;
}

/**
 * 手术准时开始率（纯函数）：准时开始数/手术总数×100，保留 2 位小数。
 *
 * @param records 手术过程记录列表
 * @returns 手术准时开始率百分比
 */
export function computeSurgeryOnTimeStartRateV13(records: SurgeryProcessRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surgeryTotalCount, 0);
  if (total === 0) return 0;
  const onTime = records.reduce((acc, r) => acc + r.onTimeStartCount, 0);
  return Math.round((onTime / total) * 10000) / 100;
}

/**
 * 手术准点结束率（纯函数）：准点结束数/手术总数×100，保留 2 位小数。
 *
 * @param records 手术过程记录列表
 * @returns 手术准点结束率百分比
 */
export function computeSurgeryOnTimeEndRateV13(records: SurgeryProcessRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surgeryTotalCount, 0);
  if (total === 0) return 0;
  const onTime = records.reduce((acc, r) => acc + r.onTimeEndCount, 0);
  return Math.round((onTime / total) * 10000) / 100;
}

/**
 * 术中不良事件数（纯函数）：求和。
 *
 * @param records 手术过程记录列表
 * @returns 术中不良事件数
 */
export function computeIntraoperativeAdverseEventCountV13(records: SurgeryProcessRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.adverseEventCount, 0);
}
