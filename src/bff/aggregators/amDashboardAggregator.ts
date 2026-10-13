/**
 * 健澜科技 jlmedaios - 合理用药统计看板聚合器（M77-A）
 * 药事科按月提交指标；看板返回各科室指标与排名；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { listByMonth, submitMetric, type AmMetric } from '../../db/repositories/amDashboardRepo.js';
import {
  antibioticRate, departmentRanking, dddsPer100, prophylaxisRate, specialClassRate, type DeptMetric,
} from '../../medical-tools/nursing/amDashboard.js';

export class AmDashError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'AmDashError';
  }
}
const forbidden = (m: string) => new AmDashError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new AmDashError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const MONTH_RE = /^\d{4}-\d{2}$/;

/** 提交月度指标。 */
export async function submitView(
  auth: AuthView,
  input: Omit<Parameters<typeof submitMetric>[0], 'submittedBy'>,
): Promise<AmMetric> {
  assertPermission(auth, 'am_dash:submit');
  if (!MONTH_RE.test(input.month.trim())) throw badRequest('月份格式应为 YYYY-MM');
  if (!input.department.trim()) throw badRequest('科室不能为空');
  return submitMetric({ ...input, month: input.month.trim(), department: input.department.trim(), submittedBy: auth.id });
}

export interface DashboardRow extends AmMetric {
  dddsPer100: number;
  antibioticRate: number;
  specialClassRate: number;
  prophylaxisRate: number;
}

/** 看板：按月返回各科室指标 + 计算率 + 按 DDDs 降序。 */
export async function dashboardView(auth: AuthView, month: string): Promise<DashboardRow[]> {
  assertPermission(auth, 'am_dash:view');
  if (auth.dataScope !== 'all') throw forbidden('超出数据权限范围');
  if (!MONTH_RE.test(month.trim())) throw badRequest('月份格式应为 YYYY-MM');
  const rows = await listByMonth(month.trim());
  const enriched: DashboardRow[] = rows.map((r) => ({
    ...r,
    dddsPer100: dddsPer100(Number(r.dddsTotal), r.inpatientDays),
    antibioticRate: antibioticRate(r.antibioticPatients, r.totalInpatients),
    specialClassRate: specialClassRate(r.specialClassPatients, r.antibioticPatients),
    prophylaxisRate: prophylaxisRate(r.prophylaxisReasonable, r.prophylaxisCases),
  }));
  const ranked: DeptMetric[] = enriched.map((r) => ({ department: r.department, ddds: Number(r.dddsTotal) }));
  const order = new Map(departmentRanking(ranked).map((x, i) => [x.department, i]));
  return enriched.sort((a, b) => (order.get(a.department) ?? 0) - (order.get(b.department) ?? 0));
}
