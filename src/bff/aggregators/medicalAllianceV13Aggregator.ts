/**
 * 健澜科技 jlmedaios - 医联体与分级诊疗 V13 纯函数（M355-D，M355 收官）
 *
 * computeDownwardReferralCountV13 / computeUpwardReferralCountV13 / computeRemoteConsultationCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医联体与分级诊疗记录 */
export interface MedicalAllianceRecordV13 {
  downwardReferralCount: number;
  upwardReferralCount: number;
  remoteConsultationCount: number;
}

/**
 * 上级下转人次（纯函数）：求和。
 *
 * @param records 医联体与分级诊疗记录列表
 * @returns 上级下转人次
 */
export function computeDownwardReferralCountV13(records: MedicalAllianceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.downwardReferralCount, 0);
}

/**
 * 下级上转人次（纯函数）：求和。
 *
 * @param records 医联体与分级诊疗记录列表
 * @returns 下级上转人次
 */
export function computeUpwardReferralCountV13(records: MedicalAllianceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.upwardReferralCount, 0);
}

/**
 * 远程会诊次数（纯函数）：求和。
 *
 * @param records 医联体与分级诊疗记录列表
 * @returns 远程会诊次数
 */
export function computeRemoteConsultationCountV13(records: MedicalAllianceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.remoteConsultationCount, 0);
}
