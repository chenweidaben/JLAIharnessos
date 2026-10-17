/**
 * 健澜科技 jlmedaios - 超声检查量 V13 纯函数（M342-D）
 *
 * computeAbdominalCountV13 / computeCardiovascularCountV13 / computeObstetricsCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 超声检查量记录 */
export interface UltrasoundVolumeRecordV13 {
  abdominalCount: number;
  cardiovascularCount: number;
  obstetricsCount: number;
}

/**
 * 腹部超声月度例数（纯函数）：求和。
 *
 * @param records 超声检查量记录列表
 * @returns 腹部超声月度例数
 */
export function computeAbdominalCountV13(records: UltrasoundVolumeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.abdominalCount, 0);
}

/**
 * 心血管超声月度例数（纯函数）：求和。
 *
 * @param records 超声检查量记录列表
 * @returns 心血管超声月度例数
 */
export function computeCardiovascularCountV13(records: UltrasoundVolumeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.cardiovascularCount, 0);
}

/**
 * 妇产超声月度例数（纯函数）：求和。
 *
 * @param records 超声检查量记录列表
 * @returns 妇产超声月度例数
 */
export function computeObstetricsCountV13(records: UltrasoundVolumeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.obstetricsCount, 0);
}
