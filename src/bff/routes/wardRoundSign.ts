/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const pendingSign = [
  { id: 'ROUND-20261103-001', patientName: '张**', ward: '呼吸内科一病区', level: 'attending', noteType: '首次病程记录', status: 'pending-sign' },
  { id: 'ROUND-20261103-002', patientName: '李**', ward: '心血管内科二病区', level: 'chief', noteType: '主治医师查房记录', status: 'pending-sign' },
  { id: 'ROUND-20261103-003', patientName: '王**', ward: '消化内科一病区', level: 'resident', noteType: '日常病程记录', status: 'pending-sign' },
];

export const wardRoundSignRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/ward-rounds/pending-sign', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: pendingSign, total: pendingSign.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'POST', path: '/api/v1/ward-rounds/:id/sign', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'signed' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      const level = (body as { level?: string }).level ?? 'attending';
      if (!['resident', 'attending', 'chief'].includes(level)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'level 必须为 resident|attending|chief'), 400);
      }
      return json(ok({ demo: true, id: c.params.id, status: 'signed', level, signedAt: new Date().toISOString() }));
    } },
  { method: 'POST', path: '/api/v1/ward-rounds/:id/return', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'returned' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: c.params.id, status: 'returned', reason: (body as { reason?: string }).reason ?? 'demo', returnedAt: new Date().toISOString() }));
    } },
];
