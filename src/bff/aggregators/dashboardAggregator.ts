/**
 * 健澜科技 jlmedaios - 院长驾驶舱数据聚合器（M9-A）
 *
 * 从 PostgreSQL 真实统计门急诊、在院、床位、待办、告警、趋势、科室负载。
 * 与其他业务聚合器一致：不读 DEMO_MODE，DB 不可用即抛错，绝不返回编造数字。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  getDashboardOverview,
  getDashboardTrend,
  getDepartmentLoad,
  getLatestAlerts,
} from '../../db/repositories/dashboardStatsRepo.js';

/**
 * 聚合院长驾驶舱全部指标。
 * @param trendDays 趋势天数（默认 14，上限 90）
 */
export async function aggregateDashboard(trendDays = 14): Promise<Record<string, unknown>> {
  const [overview, trend, departmentLoad, latestAlerts] = await Promise.all([
    getDashboardOverview(),
    getDashboardTrend(trendDays),
    getDepartmentLoad(),
    getLatestAlerts(),
  ]);
  return {
    overview,
    trend,
    departmentLoad,
    latestAlerts,
  };
}
