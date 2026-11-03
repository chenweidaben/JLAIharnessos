/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const pendingVerify = [
  { id: 'ORD-20261103-001', patientName: '张**', ward: '呼吸内科一病区', orderText: '0.9%氯化钠注射液 250ml 静滴 qd', status: 'pending', createdAt: '2026-11-03T08:20:00+08:00' },
  { id: 'ORD-20261103-002', patientName: '李**', ward: '心血管内科二病区', orderText: '阿司匹林肠溶片 100mg 口服 qd', status: 'pending', createdAt: '2026-11-03T08:35:00+08:00' },
  { id: 'ORD-20261103-003', patientName: '王**', ward: '消化内科一病区', orderText: '奥美拉唑肠溶胶囊 20mg 口服 bid', status: 'pending', createdAt: '2026-11-03T09:05:00+08:00' },
];

export const orderVerifyRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/orders/pending-verify', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: pendingVerify, total: pendingVerify.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'POST', path: '/api/v1/orders/:id/verify', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'verified' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: c.params.id, status: 'verified', verifier: (body as { verifier?: string }).verifier ?? 'demo-nurse', verifiedAt: new Date().toISOString() }));
    } },
  { method: 'POST', path: '/api/v1/orders/:id/stop', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'stopped' }));
      return json(ok({ demo: true, id: c.params.id, status: 'stopped', stoppedAt: new Date().toISOString() }));
    } },
  { method: 'POST', path: '/api/v1/orders/:id/reject', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'rejected' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: c.params.id, status: 'rejected', reason: (body as { reason?: string }).reason ?? 'demo-reason' }));
    } },
  { method: 'POST', path: '/api/v1/orders/:id/complete', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'completed' }));
      return json(ok({ demo: true, id: c.params.id, status: 'completed', completedAt: new Date().toISOString() }));
    } },
];
