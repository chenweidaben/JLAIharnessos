/** 健澜科技：P1 手术麻醉闭环深化（M86-I）。DEMO_MODE 下返回内存演示数据。 */
import { json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

interface VitalRow {
  minute: number;
  temp: number;
  sbp: number;
  dbp: number;
  pr: number;
  spo2: number;
  etco2: number;
}

function buildDemoVitals(): VitalRow[] {
  const rows: VitalRow[] = [];
  for (let m = 0; m <= 60; m += 5) {
    rows.push({
      minute: m,
      temp: 36.6 + (m === 0 ? 0 : Math.sin(m / 20) * 0.2),
      sbp: 120 + Math.round(Math.sin(m / 15) * 12),
      dbp: 74 + Math.round(Math.cos(m / 20) * 6),
      pr: 72 + Math.round(Math.sin(m / 18) * 8),
      spo2: 98 - (m > 20 && m < 40 ? 1 : 0),
      etco2: 36 + Math.round(Math.sin(m / 25) * 2),
    });
  }
  return rows;
}

const demoDrugs = [
  { time: '13:55', name: '丙泊酚', dose: '120mg', route: '静推', note: '诱导' },
  { time: '13:56', name: '罗库溴铵', dose: '50mg', route: '静推', note: '肌松' },
  { time: '14:00', name: '舒芬太尼', dose: '25μg', route: '静推', note: '镇痛诱导' },
  { time: '14:30', name: '瑞芬太尼', dose: '0.2μg/kg/min', route: '泵注', note: '维持' },
];

const demoEvents = [
  { time: '14:05', event: '气管插管顺利，双肺呼吸音对称' },
  { time: '14:40', event: '血压一过性下降至 92/55，加快补液后回升' },
];

export const anesthesiaRecordSheetRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/anesthesia/records/:surgeryId', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ surgeryId: c.params.surgeryId, vitals: [] }));
      return json(ok({
        demo: true,
        surgeryId: c.params.surgeryId,
        patientName: '张**',
        surgeryName: '腹腔镜胆囊切除术',
        anesthesiaMethod: '全身麻醉',
        vitals: buildDemoVitals(),
        drugs: demoDrugs,
        events: demoEvents,
        fluidIn: { crystalloid: 1500, colloid: 500, blood: 0 },
        fluidOut: { urine: 400, bloodLoss: 100 },
        signed: false,
      }));
    } },
  { method: 'POST', path: '/api/v1/anesthesia/records', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ status: 'ok' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      const b = body as { surgeryId?: string; vitals?: unknown; drugs?: unknown; fluidIn?: unknown; fluidOut?: unknown };
      return json(ok({
        demo: true,
        id: 'demo-anes-rec-0001',
        surgeryId: b.surgeryId ?? c.params.surgeryId ?? 'demo-surgery',
        vitalsPointCount: Array.isArray(b.vitals) ? b.vitals.length : 0,
        drugCount: Array.isArray(b.drugs) ? b.drugs.length : 0,
        fluidIn: b.fluidIn ?? {},
        fluidOut: b.fluidOut ?? {},
        status: 'ok',
        savedAt: new Date().toISOString(),
      }));
    } },
  { method: 'POST', path: '/api/v1/anesthesia/records/:id/sign', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ id: c.params.id, status: 'signed' }));
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      return json(ok({
        demo: true,
        id: c.params.id,
        status: 'signed',
        signer: (body as { signer?: string }).signer ?? 'demo-anesthesiologist',
        signedAt: new Date().toISOString(),
      }));
    } },
];
