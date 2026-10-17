/**
 * 健澜科技 jlmedaios - 标本不合格率 V13 纯函数（M338-D）
 *
 * computeSpecimenRejectRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 标本不合格率记录 */
export interface SpecimenRejectRecordV13 {
  totalSpecimens: number;
  rejectedSpecimens: number;
}

/**
 * 标本不合格率（纯函数）：不合格标本数/总标本数×100。
 *
 * @param records 标本不合格率记录列表
 * @returns 标本不合格率百分比
 */
export function computeSpecimenRejectRateV13(records: SpecimenRejectRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSpecimens, 0);
  const rejected = records.reduce((acc, r) => acc + r.rejectedSpecimens, 0);
  if (total === 0) return 0;
  return Math.round((rejected / total) * 100);
}
