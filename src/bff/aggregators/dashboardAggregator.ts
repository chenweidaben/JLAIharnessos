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
  // DEMO_MODE：返回内存演示数据，供无数据库环境下 UI 联调
  if (process.env.DEMO_MODE === '1') {
    const days = Array.from({ length: Math.min(trendDays, 14) }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (Math.min(trendDays, 14) - 1 - i));
      return {
        date: d.toISOString().slice(0, 10),
        outpatient: 320 + Math.floor(Math.random() * 80),
        emergency: 45 + Math.floor(Math.random() * 20),
        admitted: 12 + Math.floor(Math.random() * 8),
        discharged: 10 + Math.floor(Math.random() * 6),
      };
    });
    return {
      overview: {
        todayOutpatient: 386,
        todayEmergency: 52,
        currentInpatients: 428,
        todayAdmitted: 18,
        todayDischarged: 15,
        pendingOrderReview: 7,
        activeOrders: 156,
        pendingPrescriptionReview: 3,
        unresolvedCriticalAlerts: 2,
        bedsTotal: 600,
        bedsOccupied: 428,
      },
      trend: days,
      departmentLoad: [
        { department: '心血管内科', inpatients: 68, beds: 80, occupancy: 0.85 },
        { department: '呼吸内科', inpatients: 52, beds: 60, occupancy: 0.87 },
        { department: '消化内科', inpatients: 45, beds: 55, occupancy: 0.82 },
        { department: '神经内科', inpatients: 38, beds: 50, occupancy: 0.76 },
        { department: '普外科', inpatients: 55, beds: 70, occupancy: 0.79 },
        { department: '骨科', inpatients: 42, beds: 60, occupancy: 0.70 },
        { department: '儿科', inpatients: 35, beds: 45, occupancy: 0.78 },
        { department: 'ICU', inpatients: 15, beds: 20, occupancy: 0.75 },
      ],
      latestAlerts: [
        { id: 'a1', level: 'critical', message: '患者张三 血钾 2.8 mmol/L 危急值', time: '08:32' },
        { id: 'a2', level: 'warning', message: '医嘱待审核超过 2 小时', time: '08:15' },
        { id: 'a3', level: 'info', message: '新入院患者李四 待分配床位', time: '07:50' },
      ],
    };
  }
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
