import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/orderRepo';

export class OrderError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listView(view: AuthView, visitId: string) {
  if (!visitId) throw new OrderError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('order:write')) throw new OrderError(403, '无开立权限');
  if (!body.visitId) throw new OrderError(400, 'visitId 必填');
  if (!body.content) throw new OrderError(400, '医嘱内容必填');
  return repo.create({
    visitId: String(body.visitId), orderType: String(body.orderType ?? 'other'),
    content: String(body.content), dosage: body.dosage ? String(body.dosage) : undefined,
    frequency: body.frequency ? String(body.frequency) : undefined,
    route: body.route ? String(body.route) : undefined, orderedBy: view.id,
  });
}

export async function cancelView(view: AuthView, id: string, reason: string) {
  if (!view.permissions.includes('order:cancel')) throw new OrderError(403, '无取消权限');
  if (!reason) throw new OrderError(400, '取消原因必填');
  const o = await repo.cancel(id, view.id, reason);
  if (!o) throw new OrderError(409, '仅有效医嘱可取消');
  return o;
}

export async function executeView(view: AuthView, id: string, result?: string, note?: string) {
  if (!view.permissions.includes('order:execute')) throw new OrderError(403, '无执行权限');
  return repo.execute(id, view.id, result, note);
}

export async function listExecView(view: AuthView, orderId: string) {
  return repo.listExecutions(orderId);
}
