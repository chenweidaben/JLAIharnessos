/**
 * 健澜科技 jlmedaios - SBAR 交接聚合器（M73-A）
 * 发送方建 SBAR -> 接收方确认 received -> 双方确认后 closed；未接收不能关闭；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import {
  closeHandoff, createHandoff, listByVisit, receiveHandoff, type SbarHandoff,
} from '../../db/repositories/sbarRepo.js';
import { canClose, isComplete, nextStatus } from '../../medical-tools/nursing/sbar.js';

export class SbarError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'SbarError';
  }
}
const notFound = (m: string) => new SbarError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new SbarError(409, 'CONFLICT', m);
const forbidden = (m: string) => new SbarError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new SbarError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 建交接。 */
export async function createView(
  auth: AuthView,
  input: {
    visitId: string; fromUnit: string; toUnit: string;
    situation: string; background: string; assessment: string; recommendation: string;
  },
): Promise<SbarHandoff> {
  assertPermission(auth, 'sbar:create');
  if (!UUID_RE.test(input.visitId.trim())) throw badRequest('就诊标识非法');
  if (!isComplete({
    situation: input.situation, background: input.background,
    assessment: input.assessment, recommendation: input.recommendation,
  })) throw badRequest('SBAR 四段均需填写');
  if (!input.fromUnit.trim() || !input.toUnit.trim()) throw badRequest('转出/转入科室不能为空');
  return createHandoff({
    visitId: input.visitId.trim(),
    fromUnit: input.fromUnit.trim(),
    toUnit: input.toUnit.trim(),
    situation: input.situation.trim(),
    background: input.background.trim(),
    assessment: input.assessment.trim(),
    recommendation: input.recommendation.trim(),
    handoffBy: auth.id,
  });
}

/** 接收方确认。 */
export async function receiveView(auth: AuthView, id: string): Promise<SbarHandoff> {
  assertPermission(auth, 'sbar:view');
  if (!UUID_RE.test(id.trim())) throw badRequest('交接标识非法');
  if (nextStatus('pending', 'receive') !== 'received') throw conflict('当前状态不可接收');
  const rec = await receiveHandoff(id.trim(), auth.id);
  if (!rec) throw conflict('交接不存在或未处于 pending');
  return rec;
}

/** 双方确认后关闭：必须 received 且 receiver 存在。 */
export async function closeView(auth: AuthView, id: string): Promise<SbarHandoff> {
  assertPermission(auth, 'sbar:view');
  if (!UUID_RE.test(id.trim())) throw badRequest('交接标识非法');
  // 先查当前记录判定是否可关闭
  const list = await listByVisit((await getVisitId(id.trim())).visitId);
  const cur = list.find((x) => x.id === id.trim());
  if (!cur) throw notFound('交接不存在');
  if (!canClose(cur.status as 'pending' | 'received' | 'closed', cur.receiverUuid)) {
    throw conflict('未接收不能关闭');
  }
  const rec = await closeHandoff(id.trim());
  if (!rec) throw conflict('当前状态不可关闭');
  return rec;
}

/** 按就诊列出。 */
export async function listView(auth: AuthView, visitId: string): Promise<SbarHandoff[]> {
  assertPermission(auth, 'sbar:view');
  if (!UUID_RE.test(visitId.trim())) throw badRequest('就诊标识非法');
  if (auth.dataScope !== 'all') throw forbidden('超出数据权限范围');
  return listByVisit(visitId.trim());
}

// 内部：由交接 id 反查 visitId（repo 无单查接口，这里用 list 兜底不可行；
// 改为 close 直接在 repo 层 CAS 判定， aggregator 仅做前置状态校验）。
async function getVisitId(id: string): Promise<{ visitId: string }> {
  // 直接查库取 visit_id，避免 listByVisit 需要 visitId 自身。
  const db = (await import('../../db/pool.js')).getDb();
  const rows = await db`SELECT visit_id FROM clinical.sbar_handoffs WHERE id=${id}`;
  if (!rows.length) throw notFound('交接不存在');
  return { visitId: String((rows[0] as Record<string, unknown>).visit_id) };
}
