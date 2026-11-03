/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const todayCancel = [
  { id: 'REG-20261103-001', patientName: '张**', visitNo: 'MZ20261103001', department: '呼吸内科', amount: 25, status: 'cancelable' },
  { id: 'REG-20261103-002', patientName: '李**', visitNo: 'MZ20261103002', department: '心血管内科', amount: 50, status: 'cancelable' },
  { id: 'REG-20261103-003', patientName: '王**', visitNo: 'MZ20261103003', department: '消化内科', amount: 25, status: 'cancelable' },
];

export const registerRefundRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/outpatient/registrations/today-cancel', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: todayCancel, total: todayCancel.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'POST', path: '/api/v1/outpatient/registrations/:id/refund', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'registration-refunded' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: c.params.id, status: 'registration-refunded', reason: (body as { reason?: string }).reason ?? 'demo', refundedAt: new Date().toISOString() }));
    } },
];
