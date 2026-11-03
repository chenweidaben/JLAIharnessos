/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const returnPending = [
  { id: 'RT-20261103-001', patientName: '张**', item: '0.9%氯化钠注射液 250ml', quantity: 2, reason: '患者出院带药调整', status: 'pending-audit' },
  { id: 'RT-20261103-002', patientName: '李**', item: '阿司匹林肠溶片 100mg', quantity: 1, reason: '医嘱停止', status: 'pending-audit' },
];

export const pharmacyReturnRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/return/pending', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: returnPending, total: returnPending.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'POST', path: '/api/v1/pharmacy/return', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'return-submitted' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: 'demo-rt-' + Date.now(), status: 'return-submitted', payload: body }));
    } },
  { method: 'POST', path: '/api/v1/pharmacy/return/audit', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'audited' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: (body as { returnId?: string }).returnId ?? 'demo-rt', status: 'audited', approved: (body as { approved?: boolean }).approved ?? true }));
    } },
  { method: 'POST', path: '/api/v1/pharmacy/return/stock-in', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'stocked-in' }));
      return json(ok({ demo: true, id: c.params.id ?? 'demo-rt', status: 'stocked-in', stockedAt: new Date().toISOString() }));
    } },
];
