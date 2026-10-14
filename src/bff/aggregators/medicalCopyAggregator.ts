import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/medicalCopyRepo';

export class CopyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!body.visitId) throw new CopyError(400, 'visitId 必填');
  if (!body.applicantName) throw new CopyError(400, '申请人姓名必填');
  if (!body.idCardNo) throw new CopyError(400, '身份证号必填');
  if (!body.purpose) throw new CopyError(400, '用途必填');
  return repo.create({
    visitId: String(body.visitId), applicantName: String(body.applicantName),
    applicantRelation: String(body.applicantRelation ?? 'patient'),
    idCardNo: String(body.idCardNo), contactPhone: String(body.contactPhone ?? ''),
    purpose: String(body.purpose), copies: Number(body.copies ?? 1),
  });
}

export async function reviewView(view: AuthView, id: string, approve: boolean, reason?: string) {
  if (!view.permissions.includes('medical_copy:review')) throw new CopyError(403, '无审批权限');
  const r = await repo.review(id, view.id, approve, reason);
  if (!r) throw new CopyError(409, '仅待审批状态可审批');
  return r;
}

export async function completeView(view: AuthView, id: string) {
  if (!view.permissions.includes('medical_copy:complete')) throw new CopyError(403, '无完成权限');
  const r = await repo.complete(id);
  if (!r) throw new CopyError(409, '仅已审批状态可完成');
  return r;
}

export async function listView(view: AuthView, status: string) {
  return repo.listByStatus(status || 'pending');
}
