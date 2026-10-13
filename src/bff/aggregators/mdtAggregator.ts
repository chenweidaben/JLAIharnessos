/**
 * 健澜科技 jlmedaios - MDT 会诊聚合器（M66-A）
 * 医生发起→选科室排期→录纪要→结论；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import {
  createConsult, listByVisit, recordMinutes, schedule, type MdtConsult,
} from '../../db/repositories/mdtRepo.js';

export class MdtError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'MdtError';
  }
}
const notFound = (m: string) => new MdtError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new MdtError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new MdtError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function assertVisitScope(auth: AuthView, visitId: string) {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');
  return visit;
}

/** 发起 MDT。 */
export async function createView(
  auth: AuthView,
  input: { visitId: string; title: string; reason: string; departments: string[] },
): Promise<MdtConsult> {
  assertPermission(auth, 'mdt:request');
  if (!UUID_RE.test(input.visitId.trim())) throw badRequest('就诊标识非法');
  if (!input.title.trim()) throw badRequest('标题不能为空');
  if (!input.reason.trim()) throw badRequest('理由不能为空');
  await assertVisitScope(auth, input.visitId.trim());
  return createConsult({
    visitId: input.visitId.trim(),
    title: input.title.trim(),
    reason: input.reason.trim(),
    departments: input.departments ?? [],
    requestedBy: auth.id,
  });
}

/** 排期。 */
export async function scheduleView(auth: AuthView, id: string, scheduledAt: string): Promise<MdtConsult> {
  assertPermission(auth, 'mdt:request');
  if (!UUID_RE.test(id.trim())) throw badRequest('会诊标识非法');
  if (!scheduledAt.trim()) throw badRequest('排期时间不能为空');
  return schedule(id.trim(), scheduledAt.trim());
}

/** 录纪要+结论。 */
export async function minutesView(auth: AuthView, id: string, minutes: string, conclusion: string): Promise<MdtConsult> {
  assertPermission(auth, 'mdt:request');
  if (!UUID_RE.test(id.trim())) throw badRequest('会诊标识非法');
  if (!minutes.trim()) throw badRequest('纪要不能为空');
  if (!conclusion.trim()) throw badRequest('结论不能为空');
  return recordMinutes(id.trim(), minutes.trim(), conclusion.trim());
}

/** 按就诊列出。 */
export async function listView(auth: AuthView, visitId: string): Promise<MdtConsult[]> {
  assertPermission(auth, 'mdt:view');
  if (!UUID_RE.test(visitId.trim())) throw badRequest('就诊标识非法');
  await assertVisitScope(auth, visitId.trim());
  return listByVisit(visitId.trim());
}
