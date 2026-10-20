/**
 * 健澜科技 jlmedaios - 结算下钻聚合器（M23-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { listPeriodCases } from '../../db/repositories/settlementDrilldownRepo.js';
import { byDepartment, byDoctor, type PeriodCase } from '../../medical-tools/operations/settlementDrilldown.js';

export class DrilldownError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'DrilldownError';
  }
}
const forbidden = (m: string) => new DrilldownError(403, 'FORBIDDEN', m);

function assertView(auth: AuthView): void {
  if (!auth.permissions.includes('settlement_drilldown:view')) throw forbidden('缺少权限：settlement_drilldown:view');
}

export async function drilldownView(auth: AuthView, period: string) {
  assertView(auth);
  if (process.env.DEMO_MODE === '1') {
    return {
      period,
      byDepartment: [
        { department: '心血管内科', cases: 45, avgCost: 12500, insurancePaid: 10800 },
        { department: '呼吸内科', cases: 38, avgCost: 8200, insurancePaid: 7100 },
        { department: '普外科', cases: 32, avgCost: 15600, insurancePaid: 13200 },
      ],
      byDoctor: [
        { doctorName: '演示医生A', cases: 12, avgCost: 11200 },
        { doctorName: '演示医生B', cases: 10, avgCost: 9800 },
      ],
      demo: true,
    };
  }
  const cases: PeriodCase[] = await listPeriodCases(period);
  // 数据范围：admin 全院；doctor 只看本科室（按 auth.department 过滤，无科室则返回空）。
  let scoped = cases;
  const isAdmin = auth.rawRoles.includes('admin');
  if (!isAdmin) {
    const dept = auth.deptName ?? '';
    scoped = dept ? cases.filter((c) => c.department === dept) : [];
  }
  const out = {
    byDepartment: byDepartment(scoped),
    byDoctor: byDoctor(scoped),
  };
  await recordChainAudit({ actorId: auth.id, action: 'settlement.drilldown', resourceType: 'payment_group_selection', resourceId: period, result: 'success', riskLevel: 'low', detail: { period, cases: scoped.length, scope: isAdmin ? 'all' : auth.deptName ?? '' } });
  return out;
}
