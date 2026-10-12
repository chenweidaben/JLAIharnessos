/**
 * 健澜科技 jlmedaios - 成本归因聚合器（M22-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  listActualByCategory,
  listCategoryBudgets,
} from '../../db/repositories/costAttributionRepo.js';
import { attributeCosts, type CategoryInput } from '../../medical-tools/operations/costAttribution.js';

export class CostAttributionError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'CostAttributionError';
  }
}
const badRequest = (m: string) => new CostAttributionError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new CostAttributionError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new CostAttributionError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView): void {
  if (!auth.permissions.includes('drg_attribution:view')) throw forbidden('缺少权限：drg_attribution:view');
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 对某 visit 归因：实际各类别 + 分类预算 → 纯函数排序。 */
export async function attributionView(
  auth: AuthView,
  input: { visitId: string; groupCode: string },
) {
  assertPermission(auth);
  if (!UUID_RE.test(input.visitId.trim())) throw notFound('就诊不存在');

  const budgets = await listCategoryBudgets(input.groupCode);
  const actuals = await listActualByCategory(input.visitId);

  // 合并：预算类别 + 实际类别（无预算类别 expected=0）
  const map = new Map<string, CategoryInput>();
  budgets.forEach((b) => map.set(b.category, { category: b.category, actual: 0, expected: Number(b.expectedAmount) }));
  actuals.forEach((a) => {
    const cur = map.get(a.category) ?? { category: a.category, actual: 0, expected: 0 };
    cur.actual = Number(a.amount);
    map.set(a.category, cur);
  });

  const rows = attributeCosts(Array.from(map.values()), 1);
  await recordChainAudit(
    { actorId: auth.id, action: 'drg_attribution.view', resourceType: 'inpatient_cost_monitor', resourceId: input.visitId, result: 'success', riskLevel: 'low', detail: { groupCode: input.groupCode, cats: rows.length } },
  );
  return { visitId: input.visitId, groupCode: input.groupCode, rows };
}
