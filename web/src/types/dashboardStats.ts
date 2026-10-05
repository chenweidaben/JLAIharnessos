/**
 * 健澜科技 jlmedaios - 院长驾驶舱真实统计类型（M9-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 关键计数指标 */
export interface DashboardOverview {
  todayOutpatient: number;
  todayEmergency: number;
  currentInpatients: number;
  todayAdmitted: number;
  todayDischarged: number;
  pendingOrderReview: number;
  activeOrders: number;
  pendingPrescriptionReview: number;
  unresolvedCriticalAlerts: number;
  bedsTotal: number;
  bedsOccupied: number;
  bedsAvailable: number;
  bedOccupancyRate: number;
}

/** 单日趋势点 */
export interface DashboardTrendPoint {
  date: string;
  outpatient: number;
  emergency: number;
  admitted: number;
  discharged: number;
}

/** 科室负载点 */
export interface DepartmentLoad {
  department: string;
  inpatients: number;
}

/** 最新告警 */
export interface DashboardAlert {
  id: string;
  level: 'critical' | 'warning';
  title: string;
  department: string | null;
  time: string;
}

/** 院长驾驶舱完整统计 */
export interface DashboardStats {
  overview: DashboardOverview;
  trend: DashboardTrendPoint[];
  departmentLoad: DepartmentLoad[];
  latestAlerts: DashboardAlert[];
}
