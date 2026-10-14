import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/admissionNoteRepo';

export class NoteError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function getView(view: AuthView, visitId: string) {
  if (!visitId) throw new NoteError(400, 'visitId 必填');
  const n = await repo.getByVisit(visitId);
  if (!n) throw new NoteError(404, '入院记录不存在');
  return n;
}

export async function upsertView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('admission_note:write')) throw new NoteError(403, '无书写权限');
  if (!body.visitId) throw new NoteError(400, 'visitId 必填');
  if (!body.chiefComplaint) throw new NoteError(400, '主诉必填');
  if (!body.presentIllness) throw new NoteError(400, '现病史必填');
  if (!body.preliminaryDiagnosis) throw new NoteError(400, '初步诊断必填');
  return repo.upsert({ ...body, attendingDoctor: view.id });
}

export async function submitView(view: AuthView, id: string) {
  const n = await repo.submit(id);
  if (!n) throw new NoteError(409, '仅草稿可提交');
  return n;
}

export async function verifyView(view: AuthView, id: string) {
  if (!view.permissions.includes('admission_note:verify')) throw new NoteError(403, '无审核权限');
  const n = await repo.verify(id);
  if (!n) throw new NoteError(409, '仅已提交可审核');
  return n;
}
