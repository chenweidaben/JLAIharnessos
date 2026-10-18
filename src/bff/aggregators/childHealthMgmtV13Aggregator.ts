/**
 * 健澜科技 jlmedaios - 儿童保健管理 V13 纯函数（M442-B，妇幼健康与计划生育管理组）
 *
 * computeChildHealthManagementRateV13 / computeChildHealthNewbornVisitRateV13 / computeChildHealthGrowthMonitoringRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 儿童保健管理记录 */
export interface ChildHealthMgmtRecordV13 {
  managedChild: number;
  totalChild: number;
  visitedNewborn: number;
  totalNewborn: number;
  monitoredChild: number;
  shouldMonitorChild: number;
}

/**
 * 0-6 岁儿童健康管理率（纯函数）：已健康管理 0-6 岁儿童数/0-6 岁儿童总数×100，保留 2 位小数。
 *
 * @param records 儿童保健管理记录列表
 * @returns 0-6 岁儿童健康管理率百分比
 */
export function computeChildHealthManagementRateV13(records: ChildHealthMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalChild, 0);
  if (total === 0) return 0;
  const managed = records.reduce((acc, r) => acc + r.managedChild, 0);
  return Math.round((managed / total) * 10000) / 100;
}

/**
 * 新生儿访视率（纯函数）：已访视新生儿数/新生儿总数×100，保留 2 位小数。
 *
 * @param records 儿童保健管理记录列表
 * @returns 新生儿访视率百分比
 */
export function computeChildHealthNewbornVisitRateV13(records: ChildHealthMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalNewborn, 0);
  if (total === 0) return 0;
  const visited = records.reduce((acc, r) => acc + r.visitedNewborn, 0);
  return Math.round((visited / total) * 10000) / 100;
}

/**
 * 生长发育监测率（纯函数）：已监测生长发育儿童数/应监测儿童总数×100，保留 2 位小数。
 *
 * @param records 儿童保健管理记录列表
 * @returns 生长发育监测率百分比
 */
export function computeChildHealthGrowthMonitoringRateV13(records: ChildHealthMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldMonitorChild, 0);
  if (total === 0) return 0;
  const monitored = records.reduce((acc, r) => acc + r.monitoredChild, 0);
  return Math.round((monitored / total) * 10000) / 100;
}
