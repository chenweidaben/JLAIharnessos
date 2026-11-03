/** 健澜科技：P1 手术麻醉闭环深化（M86-I）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const pendingPacu = [
  { id: 'PACU-20261104-001', patientName: '张**', surgeryName: '腹腔镜胆囊切除术', anesthesiaMethod: '全麻', inPacuAt: '2026-11-04 14:50', status: 'in-pacu' },
  { id: 'PACU-20261104-002', patientName: '李**', surgeryName: '全髋关节置换术', anesthesiaMethod: '全麻', inPacuAt: '2026-11-04 15:10', status: 'in-pacu' },
  { id: 'PACU-20261104-003', patientName: '王**', surgeryName: '经尿道前列腺电切术', anesthesiaMethod: '腰硬联合', inPacuAt: '2026-11-04 15:40', status: 'in-pacu' },
];

const demoHistory = [
  { id: 'PACU-H-001', patientName: '张**', consciousness: 2, breathing: 2, movement: 2, total: 6, outcome: '出室回病房', scoredAt: '2026-11-04 15:20' },
  { id: 'PACU-H-002', patientName: '李**', consciousness: 1, breathing: 2, movement: 1, total: 4, outcome: '出室回病房', scoredAt: '2026-11-04 15:40' },
];

function inStewardRange(v: unknown): v is number {
  return typeof v === 'number' && v >= 0 && v <= 2;
}

export const pacuScoringRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pacu/pending', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: pendingPacu, total: pendingPacu.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'GET', path: '/api/v1/pacu/:visitId/history', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ visitId: c.params.visitId, items: [] }));
      return json(ok({ demo: true, visitId: c.params.visitId, items: demoHistory, total: demoHistory.length }));
    } },
  { method: 'POST', path: '/api/v1/pacu/:visitId', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.visitId, status: 'ok' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      const b = body as { consciousness?: number; breathing?: number; movement?: number };
      if (!inStewardRange(b.consciousness) || !inStewardRange(b.breathing) || !inStewardRange(b.movement)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'consciousness/breathing/movement 各须为 0-2'), 400);
      }
      const total = b.consciousness + b.breathing + b.movement;
      const canDischarge = total >= 4;
      return json(ok({
        demo: true,
        id: `demo-${c.params.visitId}`,
        status: 'ok',
        consciousness: b.consciousness,
        breathing: b.breathing,
        movement: b.movement,
        total,
        canDischarge,
        outcome: canDischarge ? '达到出室标准，转回病房' : '未达出室标准，继续复苏观察',
        scoredAt: new Date().toISOString(),
      }));
    } },
];
