/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Appointment 资源（脱敏演示数据） */
interface FhirAppointment {
  resourceType: 'Appointment';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'proposed' | 'pending' | 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'noshow';
  start: string;
  end: string;
  participant: Array<{ actor: { reference: string; display: string }; status: 'accepted' | 'declined' | 'needs-action' }>;
  reasonCode: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  description: string;
}

const demoAppointments: FhirAppointment[] = [
  {
    resourceType: 'Appointment',
    id: 'APT-001',
    meta: { versionId: '1', lastUpdated: '2026-11-03T09:00:00+08:00' },
    status: 'booked',
    start: '2026-11-05T09:30:00+08:00',
    end: '2026-11-05T10:00:00+08:00',
    participant: [
      { actor: { reference: 'Patient/P-001', display: '张**' }, status: 'accepted' },
      { actor: { reference: 'Practitioner/S-001', display: '张**' }, status: 'accepted' },
      { actor: { reference: 'Location/LOC-001', display: '门诊楼-心血管内科诊区' }, status: 'accepted' },
    ],
    reasonCode: {
      coding: [{ system: 'http://snomed.info/sct', code: '185389009', display: 'Follow-up visit' }],
      text: '心血管内科复诊',
    },
    description: '高血压随访复诊，测量血压并调整用药方案',
  },
  {
    resourceType: 'Appointment',
    id: 'APT-002',
    meta: { versionId: '1', lastUpdated: '2026-11-02T15:30:00+08:00' },
    status: 'arrived',
    start: '2026-11-04T14:00:00+08:00',
    end: '2026-11-04T14:30:00+08:00',
    participant: [
      { actor: { reference: 'Patient/P-002', display: '李**' }, status: 'accepted' },
      { actor: { reference: 'Practitioner/S-002', display: '李**' }, status: 'accepted' },
      { actor: { reference: 'Location/LOC-002', display: '影像中心-CT 室' }, status: 'accepted' },
    ],
    reasonCode: {
      coding: [{ system: 'http://snomed.info/sct', code: '363679008', display: 'Imaging' }],
      text: '胸部 CT 平扫',
    },
    description: '体检年度胸部 CT 平扫，筛查肺部结节',
  },
  {
    resourceType: 'Appointment',
    id: 'APT-003',
    meta: { versionId: '1', lastUpdated: '2026-10-30T11:00:00+08:00' },
    status: 'fulfilled',
    start: '2026-11-01T10:00:00+08:00',
    end: '2026-11-01T10:20:00+08:00',
    participant: [
      { actor: { reference: 'Patient/P-001', display: '张**' }, status: 'accepted' },
      { actor: { reference: 'Practitioner/S-003', display: '王**' }, status: 'accepted' },
    ],
    reasonCode: {
      coding: [{ system: 'http://snomed.info/sct', code: '171211004', display: 'Blood drawing' }],
      text: '静脉采血检验',
    },
    description: '空腹血糖、血脂、肝肾功能采血',
  },
];

function applySearch(q: URLSearchParams, list: FhirAppointment[]): FhirAppointment[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((a) => a.participant.some((p) => p.actor.reference === `Patient/${patient}`));
  const status = q.get('status');
  if (status) out = out.filter((a) => a.status === status);
  return out;
}

function toBundle(resources: FhirAppointment[]): Record<string, unknown> {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: resources.length,
    entry: resources.map((r) => ({ resource: r })),
  };
}

function operationOutcomeNotFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [
        { severity: 'error', code: 'not-found', diagnostics: `FHIR 资源不存在：${kind}/${id}` },
      ],
    },
    404,
  );
}

export const fhirAppointmentRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Appointment',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoAppointments)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Appointment/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoAppointments)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Appointment/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Appointment', c.params.id);
      const found = demoAppointments.find((a) => a.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Appointment', c.params.id);
      return json(found);
    },
  },
];
