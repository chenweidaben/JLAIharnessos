/**
 * 健澜科技 jlmedaios - 检验 AI 辅助解读聚合器（M3-E）
 *
 * 确定性规则引擎（不调外部 LLM）：汇总一次就诊的检验结果，
 * 按参考区间/异常标志识别异常项与危急值，生成"解读草稿"。
 *
 * 铁律：草稿仅供医师参考，不得作为诊疗依据；必须医师本人签名后生效。
 * 状态机 pending_review -> signed / rejected。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, withTx } from '../../db/pool.js';
import {
  listLabResultsByVisit,
  upsertInterpretation,
  getByVisit,
  getById,
  listInterpretations,
  setStatus,
  type LabResultRow,
  type LabInterpretation,
  type LabInterpStatus,
} from '../../db/repositories/labInterpretRepo.js';

export class LabInterpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LabInterpError';
  }
}
const badRequest = (m: string) => new LabInterpError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new LabInterpError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new LabInterpError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new LabInterpError(409, 'CONFLICT', m);

const ENGINE_VERSION = 'lab-rule-1.0';

function canAccess(auth: AuthView, department: string): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return department === auth.deptName;
  }
  return false;
}

/* ------------------------------ 纯函数引擎 ------------------------------ */

export interface EngineOutcome {
  itemCount: number;
  abnormalCount: number;
  criticalCount: number;
  summary: string;
  abnormalItems: Record<string, unknown>[];
  criticalItems: Record<string, unknown>[];
}

const CRITICAL_FLAGS = new Set(['HH', 'LL']);
const ABNORMAL_FLAGS = new Set(['H', 'L', 'HH', 'LL']);

/** 纯函数：根据就诊检验结果生成解读草稿（确定性，无外部依赖）。 */
export function interpretLabResults(results: LabResultRow[]): EngineOutcome {
  const abnormalItems: Record<string, unknown>[] = [];
  const criticalItems: Record<string, unknown>[] = [];

  for (const r of results) {
    let flag = (r.abnormalFlag ?? 'N').toUpperCase();
    // 若未给标志但有数值与参考区间，则自行判定
    if ((flag === 'N' || !flag) && r.numericValue != null) {
      const v = Number(r.numericValue);
      const lo = r.refLow != null ? Number(r.refLow) : null;
      const hi = r.refHigh != null ? Number(r.refHigh) : null;
      if (hi != null && v > hi) flag = 'H';
      else if (lo != null && v < lo) flag = 'L';
    }
    if (!ABNORMAL_FLAGS.has(flag)) continue;

    const item = {
      item: r.itemName,
      code: r.itemCode,
      value: r.value,
      unit: r.unit,
      refLow: r.refLow,
      refHigh: r.refHigh,
      flag,
    };
    abnormalItems.push(item);
    if (CRITICAL_FLAGS.has(flag) || r.isCritical) {
      criticalItems.push(item);
    }
  }

  const n = results.length;
  const abn = abnormalItems.length;
  const crit = criticalItems.length;

  const parts: string[] = [];
  parts.push(`共 ${n} 项检验，异常 ${abn} 项，其中危急值 ${crit} 项。`);
  if (crit > 0) {
    const names = criticalItems.map((c) => `${c.item}(${c.value}${c.unit ?? ''})`).join('、');
    parts.push(`危急项：${names}，建议立即复核临床并通知开单医师。`);
  } else if (abn > 0) {
    const names = abnormalItems.map((c) => `${c.item}(${c.flag})`).join('、');
    parts.push(`异常项：${names}。`);
  } else {
    parts.push('未见明显异常。');
  }
  parts.push('本结论由本地规则引擎自动生成，仅供参考，须经医师复核签名后方可采信。');

  return {
    itemCount: n,
    abnormalCount: abn,
    criticalCount: crit,
    summary: parts.join(''),
    abnormalItems,
    criticalItems,
  };
}

/* ------------------------------- 业务流程 ------------------------------- */

/** 对就诊重新生成检验解读草稿（幂等）。 */
export async function generateForVisit(visitId: string, auth: AuthView): Promise<LabInterpretation> {
  const db = getDb();
  const visitRows = await db`
    SELECT v.id, v.patient_id, v.department FROM clinical.visits v WHERE v.id = ${visitId}
  `;
  if (visitRows.length === 0) throw notFound('就诊不存在');
  const visit = visitRows[0] as { patient_id: string; department: string };
  if (!canAccess(auth, visit.department)) throw forbidden('无权访问该科室病例');

  const results = await listLabResultsByVisit(visitId, db);
  if (results.length === 0) throw badRequest('该就诊暂无检验结果，无法生成解读');

  const out = interpretLabResults(results);
  return withTx(async (tx) =>
    upsertInterpretation(
      {
        visitId,
        patientId: String(visit.patient_id),
        department: visit.department,
        itemCount: out.itemCount,
        abnormalCount: out.abnormalCount,
        criticalCount: out.criticalCount,
        summary: out.summary,
        abnormalItems: out.abnormalItems,
        criticalItems: out.criticalItems,
        engineVersion: ENGINE_VERSION,
      },
      tx,
    ),
  );
}

/** 查看某就诊解读草稿。 */
export async function getForVisit(visitId: string, auth: AuthView): Promise<LabInterpretation> {
  const row = await getByVisit(visitId);
  if (!row) throw notFound('该就诊尚未生成检验解读');
  if (!canAccess(auth, row.department)) throw forbidden('无权访问该科室病例');
  return row;
}

/** 解读草稿队列（按 DataScope 过滤）。 */
export async function listQueue(auth: AuthView, status: LabInterpStatus | null) {
  const all = await listInterpretations(status);
  return all.filter((r) => canAccess(auth, r.department));
}

/** 医师签名（pending_review -> signed）。 */
export async function signInterpretation(id: string, auth: AuthView): Promise<LabInterpretation> {
  const existing = await getById(id);
  if (!existing) throw notFound('解读记录不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权访问该科室病例');
  if (existing.status !== 'pending_review') throw conflict('仅待复核(pending_review)的解读可签名');
  const updated = await withTx(async (tx) =>
    setStatus(id, ['pending_review'], 'signed', { reviewedBy: auth.id }, tx),
  );
  if (!updated) throw conflict('解读状态已变更，请刷新');
  return updated;
}

/** 医师退回（pending_review -> rejected）。 */
export async function rejectInterpretation(
  id: string,
  auth: AuthView,
  reason: string,
): Promise<LabInterpretation> {
  const existing = await getById(id);
  if (!existing) throw notFound('解读记录不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权访问该科室病例');
  if (existing.status !== 'pending_review') throw conflict('仅待复核(pending_review)的解读可退回');
  if (!reason || !reason.trim()) throw badRequest('退回原因不能为空');
  const updated = await withTx(async (tx) =>
    setStatus(id, ['pending_review'], 'rejected', { rejectReason: reason.trim() }, tx),
  );
  if (!updated) throw conflict('解读状态已变更，请刷新');
  return updated;
}
