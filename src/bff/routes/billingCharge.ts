/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const todayQueue = [
  { id: 'BILL-20261103-101', patientName: '张**', visitNo: 'MZ20261103001', department: '呼吸内科', items: 3, totalAmount: 148.5, status: 'pending' },
  { id: 'BILL-20261103-102', patientName: '李**', visitNo: 'MZ20261103002', department: '心血管内科', items: 5, totalAmount: 326.0, status: 'pending' },
  { id: 'BILL-20261103-103', patientName: '王**', visitNo: 'MZ20261103003', department: '消化内科', items: 2, totalAmount: 78.0, status: 'pending' },
  { id: 'BILL-20261103-104', patientName: '刘**', visitNo: 'MZ20261103004', department: '骨科', items: 4, totalAmount: 560.0, status: 'pending' },
];

export const billingChargeRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/billing/today-queue', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: todayQueue, total: todayQueue.length, totalAmount: todayQueue.reduce((s, x) => s + x.totalAmount, 0) }));
      return json(ok({ items: [], total: 0, totalAmount: 0 }));
    } },
  { method: 'POST', path: '/api/v1/billing/charges', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'charged' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: 'demo-bill-' + Date.now(), status: 'charged', payload: body }));
    } },
  { method: 'POST', path: '/api/v1/billing/refund', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'refunded' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: 'demo-refund-' + Date.now(), status: 'refunded', reason: (body as { reason?: string }).reason ?? 'demo' }));
    } },
  { method: 'POST', path: '/api/v1/billing/receipt', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'reprinted' }));
      return json(ok({ demo: true, id: c.params.id ?? 'demo-receipt', status: 'reprinted', reprintedAt: new Date().toISOString() }));
    } },
];
