/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const pendingDispense = [
  { id: 'RX-20261103-201', patientName: '张**', prescriptionNo: 'CF20261103001', items: 2, doctor: 'demo-doctor-a', status: 'pending' },
  { id: 'RX-20261103-202', patientName: '李**', prescriptionNo: 'CF20261103002', items: 3, doctor: 'demo-doctor-b', status: 'pending' },
  { id: 'RX-20261103-203', patientName: '王**', prescriptionNo: 'CF20261103003', items: 1, doctor: 'demo-doctor-c', status: 'pending' },
];

export const pharmacyDispenseConfirmRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/dispense/pending', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: pendingDispense, total: pendingDispense.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'POST', path: '/api/v1/pharmacy/dispense/confirm', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'dispensed' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      const b = body as { prescriptionId?: string; pharmacistA?: string; pharmacistB?: string };
      return json(ok({ demo: true, id: b.prescriptionId ?? 'demo-rx', status: 'dispensed', pharmacistA: b.pharmacistA ?? 'demo-a', pharmacistB: b.pharmacistB ?? 'demo-b', dispensedAt: new Date().toISOString() }));
    } },
  { method: 'POST', path: '/api/v1/pharmacy/dispense/return', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'return-requested' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: 'demo-ret-' + Date.now(), status: 'return-requested', reason: (body as { reason?: string }).reason ?? 'demo' }));
    } },
];
