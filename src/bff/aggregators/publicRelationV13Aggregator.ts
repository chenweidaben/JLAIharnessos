/**
 * 健澜科技 jlmedaios - 公共关系 V13 纯函数（M398-D，M398 收官）
 *
 * computeMediaPositiveReportCountV13 / computeVolunteerServiceHoursV13 / computeCommunityHealthEducationCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 公共关系记录 */
export interface PublicRelationRecordV13 {
  positiveReportCount: number;
  volunteerHours: number;
  healthEducationCount: number;
}

/**
 * 媒体正面报道数（纯函数）：求和。
 *
 * @param records 公共关系记录列表
 * @returns 媒体正面报道数
 */
export function computeMediaPositiveReportCountV13(records: PublicRelationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.positiveReportCount, 0);
}

/**
 * 志愿服务时长（纯函数）：求和，小时。
 *
 * @param records 公共关系记录列表
 * @returns 志愿服务时长（小时）
 */
export function computeVolunteerServiceHoursV13(records: PublicRelationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.volunteerHours, 0);
}

/**
 * 社区健康宣教次数（纯函数）：求和。
 *
 * @param records 公共关系记录列表
 * @returns 社区健康宣教次数
 */
export function computeCommunityHealthEducationCountV13(records: PublicRelationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.healthEducationCount, 0);
}
