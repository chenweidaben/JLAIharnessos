import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/consentFormRepo';

export class ConsentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listView(view: AuthView, visitId: string) {
  if (!visitId) throw new ConsentError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('consent:create')) throw new ConsentError(403, '无开立权限');
  if (!body.visitId) throw new ConsentError(400, 'visitId 必填');
  if (!body.title) throw new ConsentError(400, '标题必填');
  if (!body.content) throw new ConsentError(400, '内容必填');
  return repo.create({
    visitId: String(body.visitId), consentType: String(body.consentType ?? 'other'),
    title: String(body.title), content: String(body.content),
  });
}

export async function patientSignView(view: AuthView, id: string, signature: string, witnessName?: string) {
  if (!signature) throw new ConsentError(400, '患者签名必填');
  const f = await repo.patientSign(id, signature, witnessName);
  if (!f) throw new ConsentError(409, '仅待签署同意书可签名');
  return f;
}

export async function doctorSignView(view: AuthView, id: string) {
  if (!view.permissions.includes('consent:sign')) throw new ConsentError(403, '无医生签名权限');
  const f = await repo.doctorSign(id, view.id);
  if (!f) throw new ConsentError(409, '仅患者已签同意书可医生见证');
  return f;
}
