/**
 * 健澜科技 jlmedaios - 影像报告周转时间 V13 纯函数（M338-B）
 *
 * computeXRayTATV13 / computeCTTATV13 / computeMRITATV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 影像报告周转时间记录 */
export interface ImagingTurnaroundRecordV13 {
  xrayTATHours: number;
  ctTATHours: number;
  mriTATHours: number;
}

/**
 * X 线 TAT（纯函数）：均值，保留 1 位小数。
 *
 * @param records 影像报告周转时间记录列表
 * @returns X 线 TAT（小时）
 */
export function computeXRayTATV13(records: ImagingTurnaroundRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.xrayTATHours, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * CT TAT（纯函数）：均值，保留 1 位小数。
 *
 * @param records 影像报告周转时间记录列表
 * @returns CT TAT（小时）
 */
export function computeCTTATV13(records: ImagingTurnaroundRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.ctTATHours, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * MRI TAT（纯函数）：均值，保留 1 位小数。
 *
 * @param records 影像报告周转时间记录列表
 * @returns MRI TAT（小时）
 */
export function computeMRITATV13(records: ImagingTurnaroundRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.mriTATHours, 0);
  return Math.round((total / records.length) * 10) / 10;
}
