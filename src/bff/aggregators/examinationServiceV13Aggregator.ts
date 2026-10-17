/**
 * 健澜科技 jlmedaios - 检查服务 V13 纯函数（M374-A）
 *
 * computeCtExaminationCountV13 / computeMriExaminationCountV13 / computeUltrasoundExaminationCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 检查服务记录 */
export interface ExaminationServiceRecordV13 {
  ctCount: number;
  mriCount: number;
  ultrasoundCount: number;
}

/**
 * CT 检查人次（纯函数）：求和。
 *
 * @param records 检查服务记录列表
 * @returns CT 检查人次
 */
export function computeCtExaminationCountV13(records: ExaminationServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.ctCount, 0);
}

/**
 * MRI 检查人次（纯函数）：求和。
 *
 * @param records 检查服务记录列表
 * @returns MRI 检查人次
 */
export function computeMriExaminationCountV13(records: ExaminationServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.mriCount, 0);
}

/**
 * 超声检查人次（纯函数）：求和。
 *
 * @param records 检查服务记录列表
 * @returns 超声检查人次
 */
export function computeUltrasoundExaminationCountV13(records: ExaminationServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.ultrasoundCount, 0);
}
