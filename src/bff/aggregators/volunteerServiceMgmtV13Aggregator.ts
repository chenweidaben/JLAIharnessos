/**
 * 健澜科技 jlmedaios - 志愿者服务管理 V13 纯函数（M457-B，医院文化与公益管理组）
 *
 * computeVolunteerServiceRegisteredCountV13 / computeVolunteerServiceHoursV13 / computeVolunteerServiceCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 志愿者服务管理记录 */
export interface VolunteerServiceMgmtRecordV13 {
  registeredCount: number;
  serviceHours: number;
  covered: number;
  totalDept: number;
}

/**
 * 志愿者注册人数（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.registeredCount, 0)，直接返回计数。
 *
 * @param records 志愿者服务管理记录列表
 * @returns 志愿者注册总人数（人）
 */
export function computeVolunteerServiceRegisteredCountV13(records: VolunteerServiceMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.registeredCount, 0);
}

/**
 * 志愿服务时长（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.serviceHours, 0)，直接返回总小时数。
 *
 * @param records 志愿者服务管理记录列表
 * @returns 志愿服务总时长（小时）
 */
export function computeVolunteerServiceHoursV13(records: VolunteerServiceMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.serviceHours, 0);
}

/**
 * 志愿服务覆盖率（纯函数）：已覆盖科室数/科室总数×100，保留 2 位小数。
 *
 * @param records 志愿者服务管理记录列表
 * @returns 志愿服务覆盖率百分比
 */
export function computeVolunteerServiceCoverageRateV13(records: VolunteerServiceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDept, 0);
  if (total === 0) return 0;
  const covered = records.reduce((acc, r) => acc + r.covered, 0);
  return Math.round((covered / total) * 10000) / 100;
}
