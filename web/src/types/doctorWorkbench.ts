/**
 * 健澜科技 jlmedaios - 医生站工作台类型（M79-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export type RiskLevel = 'red' | 'yellow' | 'green';

export interface DepartmentKpi {
  department: string;
  infectionRate: number;
  ddds: number;
  risk: RiskLevel;
}

export interface WorkbenchView {
  openTasksCount: number;
  unreadNotifications: number;
  activeObservations: number;
  pendingPlans: number;
  departmentKpis: DepartmentKpi[];
  summary: { urgentAlerts: number; followupsToday: number; kpis: number };
}
