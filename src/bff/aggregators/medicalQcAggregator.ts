import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/medicalQcRepo';

export class MedicalQcError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('medical_qc:view')) throw new MedicalQcError(403, '无查看权限');
  if (!visitId) throw new MedicalQcError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('medical_qc:check')) throw new MedicalQcError(403, '无质控权限');
  if (!body.visitId) throw new MedicalQcError(400, 'visitId 必填');
  if (typeof body.score !== 'number') throw new MedicalQcError(400, '分数必填');
  return repo.create({
    visitId: String(body.visitId), qcType: String(body.qcType ?? 'round'),
    checker: view.id, score: body.score,
    errors: (body.errors as repo.QcError[]) ?? [],
    suggestions: body.suggestions ? String(body.suggestions) : undefined,
  });
}

export async function rectifyView(view: AuthView, id: string) {
  const r = await repo.rectify(id);
  if (!r) throw new MedicalQcError(409, '仅待整改质控单可整改');
  return r;
}
