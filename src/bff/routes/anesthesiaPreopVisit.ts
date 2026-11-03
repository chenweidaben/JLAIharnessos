/** 健澜科技：P1 手术麻醉闭环深化（M86-I）。DEMO_MODE 下返回内存演示数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const ASA_LEVELS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

const pendingVisits = [
  { id: 'PREOP-20261104-001', patientName: '张**', gender: '男', age: 52, surgeryName: '腹腔镜胆囊切除术', surgeryTime: '2026-11-04 14:00', dept: '普外科', bedNo: '普外-12床', status: 'pending-visit' },
  { id: 'PREOP-20261104-002', patientName: '李**', gender: '女', age: 63, surgeryName: '全髋关节置换术', surgeryTime: '2026-11-04 15:30', dept: '骨科', bedNo: '骨科-08床', status: 'pending-visit' },
  { id: 'PREOP-20261104-003', patientName: '王**', gender: '男', age: 45, surgeryName: '经尿道前列腺电切术', surgeryTime: '2026-11-04 16:00', dept: '泌尿外科', bedNo: '泌尿-21床', status: 'pending-visit' },
  { id: 'PREOP-20261104-004', patientName: '赵**', gender: '女', age: 58, surgeryName: '甲状腺次全切除术', surgeryTime: '2026-11-04 16:30', dept: '普外科', bedNo: '普外-15床', status: 'pending-visit' },
];

const demoVisitDetail = {
  id: 'PREOP-20261104-001',
  patientName: '张**',
  history: '高血压病史 8 年，长期口服降压药，血压控制可；否认糖尿病、冠心病史。',
  allergyHistory: '否认食物及药物过敏史。',
  asaLevel: 'II' as string,
  airwayAssessment: 'Mallampati II 级，张口三横指，颈部活动度良好，预计气管插管顺利。',
  anesthesiaPlan: '拟全身麻醉，气管插管静吸复合全麻，术后镇痛方案 PCIA。',
  visitedBy: 'demo-anesthesiologist',
  visitedAt: '2026-11-04 10:20',
  status: 'visited',
};

export const anesthesiaPreopVisitRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/anesthesia/preop/pending', auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: pendingVisits, total: pendingVisits.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'GET', path: '/api/v1/anesthesia/preop/:visitId', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.visitId }));
      return json(ok({ demo: true, ...demoVisitDetail, id: c.params.visitId }));
    } },
  { method: 'POST', path: '/api/v1/anesthesia/preop/:visitId', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.visitId, status: 'ok' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      const b = body as { asaLevel?: string; history?: string; allergyHistory?: string; airwayAssessment?: string; anesthesiaPlan?: string };
      if (b.asaLevel && !(ASA_LEVELS as readonly string[]).includes(b.asaLevel)) {
        return json(fail(ErrorCode.BAD_REQUEST, `asaLevel 必须为 ${ASA_LEVELS.join('/')}`), 400);
      }
      return json(ok({
        demo: true,
        id: `demo-${c.params.visitId}`,
        status: 'ok',
        history: b.history ?? '',
        allergyHistory: b.allergyHistory ?? '',
        asaLevel: b.asaLevel ?? 'I',
        airwayAssessment: b.airwayAssessment ?? '',
        anesthesiaPlan: b.anesthesiaPlan ?? '',
        submittedAt: new Date().toISOString(),
      }));
    } },
];
