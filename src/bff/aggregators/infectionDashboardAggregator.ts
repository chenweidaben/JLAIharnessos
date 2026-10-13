/**
 * 健澜科技 jlmedaios - 院感监测看板聚合器（M76-A）
 * 院感科按月提交指标；看板返回各科室排名；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import {
  listByMonth, listByDepartment, submitMetric, type InfectionMetric,
} from '../../db/repositories/infectionDashboardRepo.js';
import {
  deviceRate, departmentRanking, handHygieneRate, ssiRate, type DeptMetric,
} from '../../medical-tools/nursing/infectionDashboard.js';

export class InfectionDashError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'InfectionDashError';
  }
}
const forbidden = (m: string) => new InfectionDashError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new InfectionDashError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const MONTH_RE = /^\d{4}-\d{2}$/;

/** 提交月度指标。 */
export async function submitView(
  auth: AuthView,
  input: Omit<Parameters<typeof submitMetric>[0], 'submittedBy'>,
): Promise<InfectionMetric> {
  assertPermission(auth, 'infection_dash:submit');
  if (!MONTH_RE.test(input.month.trim())) throw badRequest('月份格式应为 YYYY-MM');
  if (!input.department.trim()) throw badRequest('科室不能为空');
  return submitMetric({ ...input, month: input.month.trim(), department: input.department.trim(), submittedBy: auth.id });
}

export interface DashboardRow extends InfectionMetric {
  handHygieneRate: number;
  cautiRate: number;
  vapRate: number;
  clabsiRate: number;
  ssiRate: number;
}

/** 看板：按月返回各科室指标 + 计算率 + 按感染率降序。 */
export async function dashboardView(auth: AuthView, month: string): Promise<DashboardRow[]> {
  assertPermission(auth, 'infection_dash:view');
  if (auth.dataScope !== 'all') throw forbidden('超出数据权限范围');
  if (!MONTH_RE.test(month.trim())) throw badRequest('月份格式应为 YYYY-MM');
  const rows = await listByMonth(month.trim());
  const enriched: DashboardRow[] = rows.map((r) => ({
    ...r,
    handHygieneRate: handHygieneRate(r.handHygieneObservations, r.handHygieneCompliant),
    cautiRate: deviceRate(r.cautiCases, r.catheterDays),
    vapRate: deviceRate(r.vapCases, r.ventilatorDays),
    clabsiRate: deviceRate(r.clabsiCases, r.centralLineDays),
    ssiRate: ssiRate(r.ssiCases, r.operationCount),
  }));
  const ranked: DeptMetric[] = enriched.map((r) => ({
    department: r.department,
    infectionRate: (r.cautiRate + r.vapRate + r.clabsiRate) / 3,
  }));
  const order = new Map(departmentRanking(ranked).map((x, i) => [x.department, i]));
  return enriched.sort((a, b) => (order.get(a.department) ?? 0) - (order.get(b.department) ?? 0));
}
