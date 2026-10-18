/**
 * 健澜科技 jlmedaios - 门诊治疗室管理 V13 纯函数（M458-C，日间手术与门诊操作管理组）
 *
 * computeOutpatientTreatmentRoomVisitCountV13 / computeOutpatientTreatmentRoomOperationQualifiedRateV13 / computeOutpatientTreatmentRoomDisinfectionQualifiedRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊治疗室管理记录 */
export interface OutpatientTreatmentRoomMgmtRecordV13 {
  visitCount: number;
  qualified: number;
  totalOp: number;
  disinfected: number;
  totalDisinfection: number;
}

/**
 * 治疗室人次（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.visitCount, 0)，直接返回计数。
 *
 * @param records 门诊治疗室管理记录列表
 * @returns 治疗室总人次（人次）
 */
export function computeOutpatientTreatmentRoomVisitCountV13(records: OutpatientTreatmentRoomMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.visitCount, 0);
}

/**
 * 治疗操作合格率（纯函数）：合格治疗操作数/治疗操作总数×100，保留 2 位小数。
 *
 * @param records 门诊治疗室管理记录列表
 * @returns 治疗操作合格率百分比
 */
export function computeOutpatientTreatmentRoomOperationQualifiedRateV13(records: OutpatientTreatmentRoomMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalOp, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 治疗室消毒合格率（纯函数）：合格消毒次数/消毒总次数×100，保留 2 位小数。
 *
 * @param records 门诊治疗室管理记录列表
 * @returns 治疗室消毒合格率百分比
 */
export function computeOutpatientTreatmentRoomDisinfectionQualifiedRateV13(records: OutpatientTreatmentRoomMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDisinfection, 0);
  if (total === 0) return 0;
  const disinfected = records.reduce((acc, r) => acc + r.disinfected, 0);
  return Math.round((disinfected / total) * 10000) / 100;
}
