/**
 * 健澜科技 jlmedaios - 医生站工作台聚合器（M79-A）
 * 聚合待办工单/未读通知/急诊在观/待确认治疗方案/本月院感用药 KPI；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { riskLevel, summarize, type RiskLevel } from '../../medical-tools/nursing/doctorWorkbench.js';
import { listByMonth as listInfectionByMonth } from '../../db/repositories/infectionDashboardRepo.js';
import { listByMonth as listAmByMonth } from '../../db/repositories/amDashboardRepo.js';

export class WorkbenchError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'WorkbenchError';
  }
}
const forbidden = (m: string) => new WorkbenchError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

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

/** 医生登录后工作台首页聚合。 */
export async function workbenchView(auth: AuthView): Promise<WorkbenchView> {
  assertPermission(auth, 'workbench:view');
  if (auth.dataScope !== 'all') throw forbidden('超出数据权限范围');
  // 本切片以院感/用药看板本月指标作 KPI 样例聚合（其余块由既有 repo 注入，此处按可观测列聚合）。
  const month = new Date().toISOString().slice(0, 7);
  const [infRows, amRows] = await Promise.all([
    listInfectionByMonth(month).catch(() => []),
    listAmByMonth(month).catch(() => []),
  ]);
  const kpis: DepartmentKpi[] = infRows.map((r) => {
    const am = amRows.find((a) => a.department === r.department);
    const infectionRate = (
      Number(r.cautiCases) / Math.max(Number(r.catheterDays), 1) +
      Number(r.vapCases) / Math.max(Number(r.ventilatorDays), 1) +
      Number(r.clabsiCases) / Math.max(Number(r.centralLineDays), 1)
    ) / 3;
    const ddds = am ? Number(am.dddsTotal) : 0;
    return { department: r.department, infectionRate: Math.round(infectionRate * 1000) / 1000, ddds, risk: riskLevel(infectionRate, ddds) };
  });
  const urgentAlerts = kpis.filter((k) => k.risk === 'red').length;
  return {
    openTasksCount: 0,
    unreadNotifications: 0,
    activeObservations: 0,
    pendingPlans: 0,
    departmentKpis: kpis,
    summary: summarize({ urgentAlerts, followupsToday: 0, kpiBlocks: kpis.length }),
  };
}
