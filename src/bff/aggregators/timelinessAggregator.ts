import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/timelinessRepo';

export class TimelinessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listView(view: AuthView) {
  if (!view.permissions.includes('timeliness:view')) throw new TimelinessError(403, '无查看权限');
  return repo.listPending();
}

export async function scanView(view: AuthView) {
  if (!view.permissions.includes('timeliness:alert')) throw new TimelinessError(403, '无预警权限');
  return repo.scanLate();
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!body.visitId) throw new TimelinessError(400, 'visitId 必填');
  if (!body.docType) throw new TimelinessError(400, 'docType 必填');
  const requiredMap: Record<string, number> = {
    admission_note: 1440, first_progress: 480, daily_progress: 1440,
    discharge_summary: 1440, consent: 60, surgery_record: 1440,
  };
  const required = requiredMap[body.docType as string] ?? 1440;
  return repo.create({
    visitId: String(body.visitId), docType: String(body.docType),
    requiredMinutes: required, createdBy: view.id,
  });
}
