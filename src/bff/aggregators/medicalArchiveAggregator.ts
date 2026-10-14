import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/medicalArchiveRepo';

export class ArchiveError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function getView(view: AuthView, visitId: string) {
  if (!visitId) throw new ArchiveError(400, 'visitId 必填');
  const a = await repo.getByVisit(visitId);
  if (!a) throw new ArchiveError(404, '病历归档记录不存在');
  return a;
}

export async function archiveView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('medical_archive:archive')) throw new ArchiveError(403, '无归档权限');
  if (!visitId) throw new ArchiveError(400, 'visitId 必填');
  return repo.archive(visitId, view.id);
}

export async function sealView(view: AuthView, visitId: string, reason: string) {
  if (!view.permissions.includes('medical_archive:seal')) throw new ArchiveError(403, '无封存权限');
  if (!visitId) throw new ArchiveError(400, 'visitId 必填');
  if (!reason) throw new ArchiveError(400, '封存原因必填');
  return repo.seal(visitId, view.id, reason);
}
