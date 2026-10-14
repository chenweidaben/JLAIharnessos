import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/dischargeSummaryRepo';

export class DischargeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function getSummary(view: AuthView, visitId: string) {
  if (!visitId) throw new DischargeError(400, 'visitId 必填');
  const s = await repo.getByVisit(visitId);
  if (!s) throw new DischargeError(404, '出院小结不存在');
  return s;
}

export async function upsertSummary(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('discharge_summary:write'))
    throw new DischargeError(403, '无出院小结书写权限');
  const visitId = String(body.visitId ?? '');
  if (!visitId) throw new DischargeError(400, 'visitId 必填');
  if (!body.admissionDate || !body.dischargeDate) throw new DischargeError(400, '入出院日期必填');
  if (!body.dischargeDiagnoses || !body.admissionDiagnoses) throw new DischargeError(400, '诊断必填');
  if (!body.treatmentCourse || !body.dischargeOrders) throw new DischargeError(400, '治疗经过与出院医嘱必填');
  return repo.upsert({
    visitId, admissionDate: String(body.admissionDate), dischargeDate: String(body.dischargeDate),
    dischargeType: String(body.dischargeType ?? 'regular'),
    dischargeDiagnoses: String(body.dischargeDiagnoses), admissionDiagnoses: String(body.admissionDiagnoses),
    treatmentCourse: String(body.treatmentCourse), dischargeOrders: String(body.dischargeOrders),
    followupPlan: body.followupPlan ? String(body.followupPlan) : null,
    attendingDoctor: view.id,
  });
}

export async function submitSummary(view: AuthView, id: string) {
  if (!view.permissions.includes('discharge_summary:write'))
    throw new DischargeError(403, '无提交权限');
  const s = await repo.submit(id);
  if (!s) throw new DischargeError(409, '仅草稿状态可提交');
  return s;
}

export async function verifySummary(view: AuthView, id: string) {
  if (!view.permissions.includes('discharge_summary:verify'))
    throw new DischargeError(403, '无审核权限');
  const s = await repo.verify(id);
  if (!s) throw new DischargeError(409, '仅已提交状态可审核');
  return s;
}
