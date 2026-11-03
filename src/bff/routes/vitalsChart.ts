/** 健澜科技：HIS-EMR 一体化 P0 切片（M86-H）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const demoVitals: Record<string, Array<Record<string, unknown>>> = {
  'demo-patient-001': [
    { ts: '2026-11-03T06:00:00+08:00', temp: 36.6, pulse: 78, resp: 18, systolic: 120, diastolic: 78, weight: 62.5, intake: 0, output: 0 },
    { ts: '2026-11-03T10:00:00+08:00', temp: 36.8, pulse: 80, resp: 18, systolic: 122, diastolic: 80, weight: 62.5, intake: 200, output: 150 },
    { ts: '2026-11-03T14:00:00+08:00', temp: 37.1, pulse: 84, resp: 19, systolic: 125, diastolic: 82, weight: 62.5, intake: 400, output: 350 },
    { ts: '2026-11-03T18:00:00+08:00', temp: 36.9, pulse: 80, resp: 18, systolic: 120, diastolic: 78, weight: 62.5, intake: 600, output: 550 },
  ],
};

export const vitalsChartRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/vitals/:patientId', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ patientId: c.params.patientId, items: [] }));
      const items = demoVitals[c.params.patientId] ?? demoVitals['demo-patient-001'];
      return json(ok({ demo: true, patientId: c.params.patientId, items }));
    } },
  { method: 'POST', path: '/api/v1/vitals', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'recorded' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({ demo: true, id: 'demo-vitals-' + Date.now(), status: 'recorded', payload: body }));
    } },
];
