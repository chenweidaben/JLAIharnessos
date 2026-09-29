/**
 * 健澜科技 jlmedaios - DRG 分组聚合器（M3-D）
 *
 * 在 M3-A 病案首页之上做本地 DRG 分组（不接外部医保）：
 *  1) 取出院就诊的病案首页 → 主诊断 ICD + 是否含手术操作；
 *  2) 纯函数匹配本地规则：主诊断前缀命中 + 内/外科属性一致，最长前缀优先；
 *     未命中兜底入 UZ00；
 *  3) 预估付费 = 规则次均付费；结余 = 预估付费 - 实际费用；
 *  4) 结果幂等落库（visit_id 唯一，重分组覆盖），状态 grouped → confirmed/rejected。
 *
 * 严谨性：分组依据完整落 explanation，供医师与医保办复核；AI 仅辅助分组，
 * 最终确认由医保办本人签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, withTx } from '../../db/pool.js';
import { getFrontPageByVisit } from '../../db/repositories/frontPageRepo.js';
import {
  listDrgRules,
  upsertGroupResult,
  getResultByVisit,
  getResultById,
  listDrgResults,
  setResultStatus,
  type DrgGroupResult,
  type DrgRule,
  type DrgResultListRow,
} from '../../db/repositories/drgRepo.js';

/* -------------------------------- 错误类型 ------------------------------- */

export class DrgError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DrgError';
  }
}
const badRequest = (m: string) => new DrgError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new DrgError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new DrgError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new DrgError(409, 'CONFLICT', m);

/* ------------------------------ 访问范围 ------------------------------ */

function canAccess(auth: AuthView, department: string): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return department === auth.deptName;
  }
  return false;
}

/* --------------------------- 纯函数：规则匹配 -------------------------- */

export interface MatchOutcome {
  rule: DrgRule;
  matchedPrefix: string | null;
  fallback: boolean;
}

/**
 * 纯函数分组：在启用规则中找 requires_orp 与 hasOrp 一致、且主诊断前缀命中的规则，
 * 取最长前缀；未命中用兜底 UZ00。
 */
export function matchRule(
  rules: DrgRule[],
  primaryDxCode: string | null,
  hasOrp: boolean,
): MatchOutcome {
  const dx = (primaryDxCode ?? '').toUpperCase().trim();
  let best: { rule: DrgRule; prefix: string } | null = null;

  for (const rule of rules) {
    if (rule.groupCode === 'UZ00') continue; // 兜底单独处理
    if (rule.requiresOrp !== hasOrp) continue;
    for (const p of rule.dxPrefixes) {
      const prefix = p.toUpperCase().trim();
      if (prefix && dx.startsWith(prefix)) {
        if (!best || prefix.length > best.prefix.length) {
          best = { rule, prefix };
        }
      }
    }
  }

  if (best) {
    return { rule: best.rule, matchedPrefix: best.prefix, fallback: false };
  }
  const fallback = rules.find((r) => r.groupCode === 'UZ00')!;
  return { rule: fallback, matchedPrefix: null, fallback: true };
}

/* -------------------------------- 业务流程 ----------------------------- */

/** 对一个出院就诊运行本地 DRG 分组（幂等）。 */
export async function groupVisit(
  visitId: string,
  auth: AuthView,
): Promise<DrgGroupResult> {
  const page = await getFrontPageByVisit(visitId);
  if (!page) throw notFound('该就诊尚无病案首页，无法分组');
  if (!canAccess(auth, page.department)) {
    throw forbidden('无权访问该科室病例');
  }
  if (!page.primaryDiagnosisCode) {
    throw badRequest('病案首页主诊断 ICD 编码未填写，无法分组');
  }

  const rules = await listDrgRules();
  const hasOrp = page.operations.length > 0;
  const { rule, matchedPrefix, fallback } = matchRule(rules, page.primaryDiagnosisCode, hasOrp);

  const totalFee = page.totalFee != null ? Number(page.totalFee) : null;
  const payment = Number(rule.avgPayment);
  const balance = totalFee != null ? Number((payment - totalFee).toFixed(2)) : null;

  const explanation: Record<string, unknown> = {
    grouper: 'local',
    grouperVersion: 'local-1.0',
    primaryDxCode: page.primaryDiagnosisCode,
    hasOrp,
    matchedPrefix,
    fallback,
    matchedRule: rule.groupCode,
    candidates: rules
      .filter((r) => r.requiresOrp === hasOrp)
      .map((r) => r.groupCode),
  };

  return withTx(async (tx) =>
    upsertGroupResult(
      {
        visitId,
        frontPageId: page.id,
        patientId: page.patientId,
        department: page.department,
        primaryDxCode: page.primaryDiagnosisCode,
        hasOrp,
        groupCode: rule.groupCode,
        groupName: rule.groupName,
        mdc: rule.mdc,
        grouperVersion: 'local-1.0',
        weight: Number(rule.weight),
        estimatedPayment: payment,
        totalFee,
        balance,
        explanation,
        groupedBy: auth.id,
      },
      tx,
    ),
  );
}

/** 查看某就诊的分组结果。 */
export async function getResult(visitId: string, auth: AuthView): Promise<DrgGroupResult> {
  const row = await getResultByVisit(visitId);
  if (!row) throw notFound('该就诊尚未分组');
  if (!canAccess(auth, row.department)) throw forbidden('无权访问该科室病例');
  return row;
}

/** 分组结果队列（按 DataScope 过滤）。 */
export async function listResults(
  auth: AuthView,
  status: DrgResultListRow['status'] | null,
): Promise<DrgResultListRow[]> {
  const all = await listDrgResults(status);
  return all.filter((r) => canAccess(auth, r.department));
}

/** 医保办确认分组（grouped → confirmed）。 */
export async function confirmResult(id: string, auth: AuthView): Promise<DrgGroupResult> {
  const existing = await getResultById(id);
  if (!existing) throw notFound('分组结果不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权访问该科室病例');
  if (existing.status !== 'grouped') throw conflict('仅待复核(grouped)的结果可确认');
  const updated = await withTx(async (tx) =>
    setResultStatus(id, ['grouped'], 'confirmed', { confirmedBy: auth.id }, tx),
  );
  if (!updated) throw conflict('分组结果状态已变更，请刷新');
  return updated;
}

/** 医保办退回分组（grouped → rejected）。 */
export async function rejectResult(
  id: string,
  auth: AuthView,
  reason: string,
): Promise<DrgGroupResult> {
  const existing = await getResultById(id);
  if (!existing) throw notFound('分组结果不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权访问该科室病例');
  if (existing.status !== 'grouped') throw conflict('仅待复核(grouped)的结果可退回');
  if (!reason || !reason.trim()) throw badRequest('退回原因不能为空');
  const updated = await withTx(async (tx) =>
    setResultStatus(id, ['grouped'], 'rejected', { rejectReason: reason.trim() }, tx),
  );
  if (!updated) throw conflict('分组结果状态已变更，请刷新');
  return updated;
}

/** 健康检查用：确认 DB 可连且规则目录可读。 */
export async function healthCheck(): Promise<{ ok: boolean; rules: number }> {
  const rules = await listDrgRules(getDb());
  return { ok: rules.length > 0, rules: rules.length };
}
