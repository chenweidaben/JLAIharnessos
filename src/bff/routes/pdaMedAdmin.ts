/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const todayDue = [
  { id: 'MED-20261103-001', patientName: '张**', bedNo: '301-2', drug: '0.9%氯化钠注射液 250ml', dueTime: '2026-11-03T08:00:00+08:00', status: 'due' },
  { id: 'MED-20261103-002', patientName: '李**', bedNo: '402-1', drug: '阿司匹林肠溶片 100mg', dueTime: '2026-11-03T08:00:00+08:00', status: 'due' },
  { id: 'MED-20261103-003', patientName: '王**', bedNo: '503-3', drug: '奥美拉唑肠溶胶囊 20mg', dueTime: '2026-11-03T12:00:00+08:00', status: 'due' },
];

export const pdaMedAdminRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/med-admin/today-due', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: todayDue, total: todayDue.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'POST', path: '/api/v1/med-admin/scan', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ matched: true }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      const b = body as { patientBarcode?: string; drugBarcode?: string; orderNo?: string };
      return json(ok({ demo: true, matched: true, patientBarcode: b.patientBarcode ?? 'demo-p', drugBarcode: b.drugBarcode ?? 'demo-d', orderNo: b.orderNo ?? 'demo-o', scannedAt: new Date().toISOString() }));
    } },
  { method: 'POST', path: '/api/v1/med-admin/:id/confirm', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'administered' }));
      return json(ok({ demo: true, id: c.params.id, status: 'administered', administeredAt: new Date().toISOString() }));
    } },
];
