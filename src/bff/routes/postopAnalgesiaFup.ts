/** 健澜科技：P1 手术麻醉闭环深化（M86-I）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const RAMSAY_LEVELS = [1, 2, 3, 4, 5, 6] as const;

const pendingFollowups = [
  { id: 'FUP-20261104-001', patientName: '张**', surgeryName: '腹腔镜胆囊切除术', dept: '普外科', surgeryEndAt: '2026-11-04 11:30', window: '2h' as const, pca: true, status: 'pending' },
  { id: 'FUP-20261104-002', patientName: '李**', surgeryName: '全髋关节置换术', dept: '骨科', surgeryEndAt: '2026-11-03 16:00', window: '24h' as const, pca: true, status: 'pending' },
  { id: 'FUP-20261104-003', patientName: '王**', surgeryName: '经尿道前列腺电切术', dept: '泌尿外科', surgeryEndAt: '2026-11-03 18:00', window: '48h' as const, pca: false, status: 'pending' },
  { id: 'FUP-20261104-004', patientName: '赵**', surgeryName: '甲状腺次全切除术', dept: '普外科', surgeryEndAt: '2026-11-02 15:00', window: '72h' as const, pca: false, status: 'pending' },
];

export const postopAnalgesiaFupRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/postop/analgesia/pending', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: pendingFollowups, total: pendingFollowups.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'POST', path: '/api/v1/postop/analgesia/:visitId', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.visitId, status: 'ok' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      const b = body as { vas?: number; ramsay?: number; sideEffects?: string[]; pcaPressCount?: number };
      if (b.vas !== undefined && (b.vas < 0 || b.vas > 10)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'vas 须为 0-10'), 400);
      }
      if (b.ramsay !== undefined && !(RAMSAY_LEVELS as readonly number[]).includes(b.ramsay)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'ramsay 须为 1-6'), 400);
      }
      return json(ok({
        demo: true,
        id: `demo-${c.params.visitId}`,
        status: 'ok',
        vas: b.vas ?? 0,
        ramsay: b.ramsay ?? 2,
        sideEffects: Array.isArray(b.sideEffects) ? b.sideEffects : [],
        pcaPressCount: b.pcaPressCount ?? 0,
        submittedAt: new Date().toISOString(),
      }));
    } },
];
