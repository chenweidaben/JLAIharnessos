/**
 * 健澜科技 jlmedaios - 体检中心聚合器（M40-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  listPackages, getPackage, createOrder, createOrderItem, listOrderItems,
  markItemComplete, getOrder, setOrderStatus, type Package, type Order, type OrderItem,
} from '../../db/repositories/healthCheckRepo.js';
import { progress, allItemsCompleted } from '../../medical-tools/nursing/healthCheck.js';

export class HealthCheckError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'HealthCheckError';
  }
}
const badRequest = (m: string) => new HealthCheckError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new HealthCheckError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new HealthCheckError(403, 'FORBIDDEN', m);
function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listPackagesView(auth: AuthView): Promise<Package[]> {
  assertPermission(auth, 'healthcheck:view');
  return listPackages();
}

export async function createOrderView(
  auth: AuthView,
  inp: { packageId: string; patientId: string; appointmentDate: string },
): Promise<{ order: Order; items: OrderItem[]; progress: number }> {
  assertPermission(auth, 'healthcheck:manage');
  if (!UUID_RE.test(inp.packageId) || !UUID_RE.test(inp.patientId)) throw badRequest('id 非法');
  return withTx(async (tx) => {
    const pkg = await getPackage(inp.packageId);
    if (!pkg) throw notFound('套餐不存在');
    const order = await createOrder(inp, tx);
    for (const it of pkg.items) await createOrderItem(order.id, it, tx);
    const items = await listOrderItems(order.id, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'healthcheck.order', resourceType: 'health_check_order', resourceId: order.id,
      patientRef: order.patientId, visitRef: null, result: 'success',
      detail: { package: pkg.name, items: items.length },
    }, tx);
    return { order, items, progress: progress(0, items.length) };
  });
}

export async function completeItemView(
  auth: AuthView,
  orderId: string,
  itemName: string,
): Promise<{ order: Order; items: OrderItem[]; progress: number; reportPushed: boolean }> {
  assertPermission(auth, 'healthcheck:manage');
  if (!UUID_RE.test(orderId)) throw badRequest('orderId 非法');
  return withTx(async (tx) => {
    const order = await getOrder(orderId, tx);
    if (!order) throw notFound('体检单不存在');
    await markItemComplete(orderId, itemName, tx);
    const items = await listOrderItems(orderId, tx);
    const done = items.filter(i => i.completed).length;
    let reportPushed = false;
    if (allItemsCompleted(items)) {
      await setOrderStatus(orderId, 'completed', tx);
      reportPushed = true;
    }
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'healthcheck.item', resourceType: 'health_check_order', resourceId: orderId,
      patientRef: order.patientId, visitRef: null, result: 'success',
      detail: { item: itemName, done, total: items.length, reportPushed },
    }, tx);
    const updated = (await getOrder(orderId, tx))!;
    return { order: updated, items, progress: progress(done, items.length), reportPushed };
  });
}

export async function getOrderView(auth: AuthView, orderId: string): Promise<{ order: Order; items: OrderItem[]; progress: number }> {
  assertPermission(auth, 'healthcheck:view');
  if (!UUID_RE.test(orderId)) throw badRequest('orderId 非法');
  const order = await getOrder(orderId);
  if (!order) throw notFound('体检单不存在');
  const items = await listOrderItems(orderId);
  const done = items.filter(i => i.completed).length;
  return { order, items, progress: progress(done, items.length) };
}
