/**
 * 健澜科技 jlmedaios - 医保对账聚合器（M3-G）
 *
 * 本地对账（不接外部医保）：把已收费费用明细逐行与收费目录重算，
 * expected = quantity * catalog.price，diff = posted - expected，
 * 一致(|diff|<0.01) 记 matched，否则 discrepancy。状态机 draft -> confirmed/disputed。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import {
  fetchChargedFeeLines,
  upsertRun,
  getRunById,
  listRuns,
  listItems,
  setStatus,
  type FeeLine,
  type ReconRun,
  type ReconItem,
} from '../../db/repositories/reconRepo.js';

export class ReconError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ReconError';
  }
}
const badRequest = (m: string) => new ReconError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ReconError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new ReconError(409, 'CONFLICT', m);

const EPS = 0.01;

export interface ComputedLine extends FeeLine {
  expectedAmount: string;
  diff: string;
  matched: boolean;
  note: string | null;
}

/** 纯函数：逐行重算并汇总。 */
export function computeLines(lines: FeeLine[]): {
  lines: ComputedLine[];
  totalPosted: string;
  totalExpected: string;
  matched: number;
  discrepancy: number;
} {
  let totalPosted = 0;
  let totalExpected = 0;
  let matched = 0;
  let discrepancy = 0;

  const computed: ComputedLine[] = lines.map((l) => {
    const qty = Number(l.quantity || 1);
    const posted = Number(l.postedAmount || 0);
    const expected = l.catalogPrice != null ? Number(l.catalogPrice) * qty : 0;
    const diff = Number((posted - expected).toFixed(2));
    const ok = Math.abs(diff) < EPS;
    const note =
      l.catalogPrice == null
        ? '目录无此项目，待核价'
        : ok
          ? null
          : `差异 ${diff.toFixed(2)} 元`;
    if (l.catalogPrice != null && ok) matched += 1;
    else discrepancy += 1;
    totalPosted += posted;
    totalExpected += expected;
    return { ...l, expectedAmount: expected.toFixed(2), diff: diff.toFixed(2), matched: ok, note };
  });

  return {
    lines: computed,
    totalPosted: totalPosted.toFixed(2),
    totalExpected: totalExpected.toFixed(2),
    matched,
    discrepancy,
  };
}

/** 生成（或重算）一次对账批次，run_no 按当日固定，幂等覆盖。 */
export async function runReconciliation(auth: AuthView): Promise<ReconRun> {
  const lines = await fetchChargedFeeLines();
  if (lines.length === 0) throw badRequest('当前无已收费费用明细，无可对账数据');
  const c = computeLines(lines);
  const runNo = `RECON-${new Date().toISOString().slice(0, 10)}`;
  return withTx(async (tx) =>
    upsertRun(
      {
        runNo,
        periodLabel: new Date().toISOString().slice(0, 10),
        summary: {
          totalItems: lines.length,
          matchedItems: c.matched,
          discrepancyItems: c.discrepancy,
          totalPosted: c.totalPosted,
          totalExpected: c.totalExpected,
        },
        lines: c.lines,
        createdBy: auth.id,
      },
      tx,
    ),
  );
}

export async function listRunSummaries(): Promise<ReconRun[]> {
  return listRuns();
}

export async function getRunDetail(id: string): Promise<{ run: ReconRun; items: ReconItem[] }> {
  const run = await getRunById(id);
  if (!run) throw notFound('对账批次不存在');
  const items = await listItems(id);
  return { run, items };
}

/** 财务确认（draft -> confirmed）。 */
export async function confirmRun(id: string, auth: AuthView): Promise<ReconRun> {
  const existing = await getRunById(id);
  if (!existing) throw notFound('对账批次不存在');
  if (existing.status !== 'draft') throw conflict('仅待复核(draft)的批次可确认');
  const updated = await withTx(async (tx) => setStatus(id, 'confirmed', { reviewedBy: auth.id }, tx));
  if (!updated) throw conflict('批次状态已变更，请刷新');
  return updated;
}

/** 差异挂起（draft -> disputed）。 */
export async function disputeRun(id: string, auth: AuthView, note: string): Promise<ReconRun> {
  const existing = await getRunById(id);
  if (!existing) throw notFound('对账批次不存在');
  if (existing.status !== 'draft') throw conflict('仅待复核(draft)的批次可挂起');
  if (!note || !note.trim()) throw badRequest('挂起原因不能为空');
  const updated = await withTx(async (tx) =>
    setStatus(id, 'disputed', { reviewedBy: auth.id, note: note.trim() }, tx),
  );
  if (!updated) throw conflict('批次状态已变更，请刷新');
  return updated;
}
