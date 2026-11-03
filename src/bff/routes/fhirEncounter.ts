/** 健澜科技：P1 FHIR R4 资源出口（M86-I）。DEMO_MODE 下返回标准 FHIR R4 JSON 结构。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Encounter 资源（关联 Patient 演示数据） */
interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class: { system: string; code: string; display: string };
  type: Array<{ coding: Array<{ system: string; code: string; display: string }>; text: string }>;
  subject: { reference: string; display?: string };
  period: { start: string; end?: string };
  location: Array<{ location: { reference: string; display: string }; period: { start: string } }>;
  hospitalization: {
    admitSource: { coding: Array<{ code: string; display: string }>; text: string };
    dischargeDisposition?: { coding: Array<{ code: string; display: string }>; text: string };
  };
  serviceProvider: { reference: string; display: string };
}

const demoEncounters: FhirEncounter[] = [
  {
    resourceType: 'Encounter',
    id: 'ENC-001',
    meta: { versionId: '4', lastUpdated: '2026-11-03T14:00:00+08:00' },
    status: 'in-progress',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: '住院' },
    type: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/encounter-type', code: 'ADMS', display: '入院' }],
        text: '住院就诊',
      },
    ],
    subject: { reference: 'Patient/P-001', display: '张**' },
    period: { start: '2026-11-01T08:30:00+08:00' },
    location: [
      {
        location: { reference: 'Location/WARD-3F', display: '三病区 3 床' },
        period: { start: '2026-11-01T09:00:00+08:00' },
      },
    ],
    hospitalization: {
      admitSource: {
        coding: [{ code: 'EMER', display: '急诊转入' }],
        text: '急诊入院',
      },
    },
    serviceProvider: { reference: 'Organization/HOSP-001', display: '示例医院' },
  },
  {
    resourceType: 'Encounter',
    id: 'ENC-002',
    meta: { versionId: '2', lastUpdated: '2026-10-20T11:00:00+08:00' },
    status: 'finished',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: '门诊' },
    type: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/encounter-type', code: 'FOOD', display: '复诊' }],
        text: '门诊复诊',
      },
    ],
    subject: { reference: 'Patient/P-001', display: '张**' },
    period: { start: '2026-10-20T09:00:00+08:00', end: '2026-10-20T09:40:00+08:00' },
    location: [
      {
        location: { reference: 'Location/CLIN-CARD', display: '心血管内科门诊' },
        period: { start: '2026-10-20T09:00:00+08:00' },
      },
    ],
    hospitalization: {
      admitSource: { coding: [{ code: 'OUTP', display: '门诊' }], text: '门诊就诊' },
    },
    serviceProvider: { reference: 'Organization/HOSP-001', display: '示例医院' },
  },
  {
    resourceType: 'Encounter',
    id: 'ENC-003',
    meta: { versionId: '3', lastUpdated: '2026-11-02T17:30:00+08:00' },
    status: 'finished',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: '住院' },
    type: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/encounter-type', code: 'ADMS', display: '入院' }],
        text: '住院就诊',
      },
    ],
    subject: { reference: 'Patient/P-002', display: '李**' },
    period: { start: '2026-10-28T10:00:00+08:00', end: '2026-11-02T15:00:00+08:00' },
    location: [
      {
        location: { reference: 'Location/WARD-5F', display: '五病区 12 床' },
        period: { start: '2026-10-28T10:30:00+08:00' },
      },
    ],
    hospitalization: {
      admitSource: { coding: [{ code: 'OUTP', display: '门诊转入' }], text: '门诊收治入院' },
      dischargeDisposition: { coding: [{ code: 'HOME', display: '回家' }], text: '医嘱离院' },
    },
    serviceProvider: { reference: 'Organization/HOSP-001', display: '示例医院' },
  },
  {
    resourceType: 'Encounter',
    id: 'ENC-004',
    meta: { versionId: '1', lastUpdated: '2026-11-03T08:10:00+08:00' },
    status: 'in-progress',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: '住院' },
    type: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/encounter-type', code: 'ADMS', display: '入院' }],
        text: '住院就诊',
      },
    ],
    subject: { reference: 'Patient/P-003', display: '王**' },
    period: { start: '2026-11-03T08:00:00+08:00' },
    location: [
      {
        location: { reference: 'Location/WARD-3F', display: '三病区 8 床' },
        period: { start: '2026-11-03T08:30:00+08:00' },
      },
    ],
    hospitalization: {
      admitSource: { coding: [{ code: 'OUTP', display: '门诊转入' }], text: '门诊收治入院' },
    },
    serviceProvider: { reference: 'Organization/HOSP-001', display: '示例医院' },
  },
];

function applySearch(q: URLSearchParams, list: FhirEncounter[]): FhirEncounter[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((e) => e.subject.reference === `Patient/${patient}`);
  const status = q.get('status');
  if (status) out = out.filter((e) => e.status === status);
  return out;
}

function toBundle(resources: FhirEncounter[]): Record<string, unknown> {
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

export const fhirEncounterRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Encounter',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoEncounters)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Encounter/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Encounter', c.params.id);
      const found = demoEncounters.find((e) => e.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Encounter', c.params.id);
      return json(found);
    },
  },
];
