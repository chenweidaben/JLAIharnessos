/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const pendingBed = [
  { id: 'ADM-20261103-001', patientName: '张**', fromDept: '急诊内科', suggestedWard: '呼吸内科一病区', status: 'pending-bed' },
  { id: 'ADM-20261103-002', patientName: '李**', fromDept: '门诊心内科', suggestedWard: '心血管内科二病区', status: 'pending-bed' },
  { id: 'ADM-20261103-003', patientName: '王**', fromDept: '急诊外科', suggestedWard: '普外科一病区', status: 'pending-bed' },
];

export const admissionCheckinRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/admissions/pending-bed', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: pendingBed, total: pendingBed.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'POST', path: '/api/v1/admissions/:id/assign-bed', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'bed-assigned' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: c.params.id, status: 'bed-assigned', bedNo: (body as { bedNo?: string }).bedNo ?? 'demo-bed-301-2', assignedAt: new Date().toISOString() }));
    } },
  { method: 'POST', path: '/api/v1/admissions/:id/wristband', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'wristband-printed' }));
      return json(ok({ demo: true, id: c.params.id, status: 'wristband-printed', printedAt: new Date().toISOString() }));
    } },
];
