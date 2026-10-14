import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/consultRequestRepo';

export class ConsultError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('consult:request')) throw new ConsultError(403, '无申请权限');
  if (!body.visitId) throw new ConsultError(400, 'visitId 必填');
  if (!body.reason) throw new ConsultError(400, '会诊原因必填');
  if (!body.consultingDept) throw new ConsultError(400, '会诊科室必填');
  return repo.create({
    visitId: String(body.visitId), consultType: String(body.consultType ?? 'routine'),
    requestingDept: String(body.requestingDept ?? '内科'), requestingDoctor: view.id,
    consultingDept: String(body.consultingDept), reason: String(body.reason),
    clinicalInfo: body.clinicalInfo ? String(body.clinicalInfo) : undefined,
  });
}

export async function listView(view: AuthView) {
  return repo.listPending();
}

export async function acceptView(view: AuthView, id: string) {
  if (!view.permissions.includes('consult:respond')) throw new ConsultError(403,'无应答权限'');
  const r = await repo.accept(id, view.id);
  if (!r) throw new ConsultError(409, '仅待应答会诊可接受');
  return r;
}

export async function completeView(view: AuthView, id: string, note: string) {
  if (!view.permissions.includes('consult:respond')) throw new ConsultError(403, '无应答权限');
  if (!note) throw new ConsultError(400, '会诊意见必填');
  const r = await repo.complete(id, note);
  if (!r) throw new ConsultError(409, '仅已接受会诊可完成');
  return r;
}

