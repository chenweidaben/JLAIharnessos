/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const settlePending = [
  { id: 'DIS-20261103-001', patientName: '张**', ward: '呼吸内科一病区', admissionDate: '2026-10-28', totalAmount: 4820.50, deposit: 5000, status: 'pending' },
  { id: 'DIS-20261103-002', patientName: '李**', ward: '心血管内科二病区', admissionDate: '2026-10-25', totalAmount: 12860.00, deposit: 10000, status: 'pending' },
  { id: 'DIS-20261103-003', patientName: '王**', ward: '消化内科一病区', admissionDate: '2026-10-30', totalAmount: 2350.80, deposit: 3000, status: 'pending' },
];

export const dischargeSettleRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/discharge/settle-pending', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: settlePending, total: settlePending.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'POST', path: '/api/v1/discharge/settle', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'settled' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: (body as { dischargeId?: string }).dischargeId ?? 'demo-dis', status: 'settled', settledAt: new Date().toISOString() }));
    } },
  { method: 'POST', path: '/api/v1/discharge/refund', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'deposit-refunded' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: c.params.id ?? 'demo-dis', status: 'deposit-refunded', amount: (body as { amount?: number }).amount ?? 0 }));
    } },
  { method: 'POST', path: '/api/v1/discharge/reprint', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'invoice-reprinted' }));
      return json(ok({ demo: true, id: c.params.id ?? 'demo-dis', status: 'invoice-reprinted', reprintedAt: new Date().toISOString() }));
    } },
];
