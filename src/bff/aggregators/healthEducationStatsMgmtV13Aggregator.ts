/**
 * 健澜科技 jlmedaios - 健康宣教管理（统计视角）V13 纯函数（M457-C，医院文化与公益管理组）
 *
 * 避让说明：基础名 healthEducationMgmtV13 已被早期切片占用，本切片改用 -stats 维度后缀避让。
 *
 * computeHealthEducationStatsLectureCountV13 / computeHealthEducationStatsMaterialDistributionCountV13 / computeHealthEducationStatsConsultationCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 健康宣教管理（统计视角）记录 */
export interface HealthEducationStatsMgmtRecordV13 {
  lectureCount: number;
  materialCount: number;
  consultationCount: number;
}

/**
 * 健康讲座场次（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.lectureCount, 0)，直接返回计数。
 *
 * @param records 健康宣教管理（统计视角）记录列表
 * @returns 健康讲座总场次（场）
 */
export function computeHealthEducationStatsLectureCountV13(records: HealthEducationStatsMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.lectureCount, 0);
}

/**
 * 宣教材料发放量（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.materialCount, 0)，直接返回计数。
 *
 * @param records 健康宣教管理（统计视角）记录列表
 * @returns 宣教材料发放总量（份）
 */
export function computeHealthEducationStatsMaterialDistributionCountV13(records: HealthEducationStatsMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.materialCount, 0);
}

/**
 * 健康咨询人次（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.consultationCount, 0)，直接返回计数。
 *
 * @param records 健康宣教管理（统计视角）记录列表
 * @returns 健康咨询总人次（人次）
 */
export function computeHealthEducationStatsConsultationCountV13(records: HealthEducationStatsMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.consultationCount, 0);
}
