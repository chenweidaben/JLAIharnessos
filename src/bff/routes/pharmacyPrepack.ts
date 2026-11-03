/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const prepackTasks = [
  { id: 'PP-20261103-001', ward: '呼吸内科一病区', batch: '日间摆药-08:00', patientCount: 18, status: 'pending' },
  { id: 'PP-20261103-002', ward: '心血管内科二病区', batch: '日间摆药-08:00', patientCount: 24, status: 'pending' },
  { id: 'PP-20261103-003', ward: '消化内科一病区', batch: '晚间摆药-16:00', patientCount: 12, status: 'pending' },
];

export const pharmacyPrepackRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/prepack/tasks', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: prepackTasks, total: prepackTasks.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'POST', path: '/api/v1/pharmacy/prepack/:id/done', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'done' }));
      return json(ok({ demo: true, id: c.params.id, status: 'done', doneAt: new Date().toISOString() }));
    } },
];
