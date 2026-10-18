/**
 * 健澜科技 jlmedaios - 学术交流管理 V13 纯函数（M456-C，学科建设与科研管理组）
 *
 * computeAcademicExchangeActivityCountV13 / computeAcademicExchangeAttendeeCountV13 / computeAcademicExchangeContinuingEducationCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 学术交流管理记录 */
export interface AcademicExchangeMgmtRecordV13 {
  activityCount: number;
  attendeeCount: number;
  continuingEduCount: number;
}

/**
 * 学术活动举办次数（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.activityCount, 0)，直接返回计数。
 *
 * @param records 学术交流管理记录列表
 * @returns 学术活动举办总量（次）
 */
export function computeAcademicExchangeActivityCountV13(records: AcademicExchangeMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.activityCount, 0);
}

/**
 * 外出参会人次（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.attendeeCount, 0)，直接返回计数。
 *
 * @param records 学术交流管理记录列表
 * @returns 外出参会总人次（人次）
 */
export function computeAcademicExchangeAttendeeCountV13(records: AcademicExchangeMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.attendeeCount, 0);
}

/**
 * 主办继教项目数（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.continuingEduCount, 0)，直接返回计数。
 *
 * @param records 学术交流管理记录列表
 * @returns 主办继教项目总数（项）
 */
export function computeAcademicExchangeContinuingEducationCountV13(records: AcademicExchangeMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.continuingEduCount, 0);
}
