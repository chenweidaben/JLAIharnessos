import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/progressNoteRepo';

export class NoteError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listView(view: AuthView, visitId: string) {
  if (!visitId) throw new NoteError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('progress_note:write')) throw new NoteError(403, '无书写权限');
  if (!body.visitId) throw new NoteError(400, 'visitId 必填');
  if (!body.content) throw new NoteError(400, '内容必填');
  if (!body.noteType) throw new NoteError(400, '记录类型必填');
  return repo.create({
    visitId: String(body.visitId), noteType: String(body.noteType),
    content: String(body.content), attendingDoctor: view.id,
  });
}

export async function signView(view: AuthView, id: string) {
  if (!view.permissions.includes('progress_note:sign')) throw new NoteError(403, '无签名权限');
  const n = await repo.sign(id);
  if (!n) throw new NoteError(409, '仅草稿状态可签名');
  return n;
}
