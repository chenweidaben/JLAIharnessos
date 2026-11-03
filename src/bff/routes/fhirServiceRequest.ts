/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 ServiceRequest 资源（脱敏演示数据） */
interface FhirServiceRequest {
  resourceType: 'ServiceRequest';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'option' | 'directive' | 'filler-order' | 'instance-order' | 'original-order' | 'reflex-order';
  code: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  subject: { reference: string };
  encounter?: { reference: string };
  authoredOn: string;
  requester?: { reference: string; display?: string };
  performer?: Array<{ reference: string; display?: string }>;
  occurrenceDateTime?: string;
  reasonCode?: Array<{ coding: Array<{ system: string; code: string; display: string }>; text: string }>;
}

const demoServiceRequests: FhirServiceRequest[] = [
  {
    resourceType: 'ServiceRequest',
    id: 'SR-001',
    meta: { versionId: '1', lastUpdated: '2026-11-03T08:20:00+08:00' },
    status: 'active',
    intent: 'order',
    code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: '血压复查' }], text: '动态血压监测（24h）' },
    subject: { reference: 'Patient/P-001' },
    encounter: { reference: 'Encounter/ENC-001' },
    authoredOn: '2026-11-03T08:20:00+08:00',
    requester: { reference: 'Practitioner/DR-001', display: '心内科主任医师' },
    performer: [{ reference: 'Organization/CARDIO-LAB', display: '心功能室' }],
    occurrenceDateTime: '2026-11-05T08:00:00+08:00',
    reasonCode: [{ coding: [{ system: 'http://snomed.info/sct', code: '38341003', display: '高血压' }], text: '收缩压偏高需复查' }],
  },
  {
    resourceType: 'ServiceRequest',
    id: 'SR-002',
    meta: { versionId: '1', lastUpdated: '2026-11-02T10:20:00+08:00' },
    status: 'completed',
    intent: 'order',
    code: { coding: [{ system: 'http://loinc.org', code: '24323-8', display: '糖尿病筛查' }], text: '糖化血红蛋白 + 空腹血糖检测' },
    subject: { reference: 'Patient/P-002' },
    encounter: { reference: 'Encounter/ENC-002' },
    authoredOn: '2026-11-02T09:00:00+08:00',
    requester: { reference: 'Practitioner/DR-002', display: '内分泌科副主任医师' },
    performer: [{ reference: 'Organization/LAB', display: '检验科' }],
    occurrenceDateTime: '2026-11-02T09:30:00+08:00',
    reasonCode: [{ coding: [{ system: 'http://snomed.info/sct', code: '44054006', display: '2型糖尿病筛查' }], text: '糖尿病筛查' }],
  },
  {
    resourceType: 'ServiceRequest',
    id: 'SR-003',
    meta: { versionId: '1', lastUpdated: '2026-11-01T15:10:00+08:00' },
    status: 'on-hold',
    intent: 'order',
    code: { coding: [{ system: 'http://loinc.org', code: '58410-2', display: '血常规复查' }], text: '血常规五分类复查' },
    subject: { reference: 'Patient/P-003' },
    authoredOn: '2026-11-01T15:10:00+08:00',
    requester: { reference: 'Practitioner/DR-002', display: '内科门诊医师' },
    performer: [{ reference: 'Organization/LAB', display: '检验科' }],
    occurrenceDateTime: '2026-11-10T08:00:00+08:00',
    reasonCode: [{ coding: [{ system: 'http://snomed.info/sct', code: '267036007', display: '白细胞升高待查' }], text: '白细胞轻度升高复查' }],
  },
];

function applySearch(q: URLSearchParams, list: FhirServiceRequest[]): FhirServiceRequest[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((s) => s.subject.reference === `Patient/${patient}`);
  const status = q.get('status');
  if (status) out = out.filter((s) => s.status === status);
  return out;
}

function toBundle(resources: FhirServiceRequest[]): Record<string, unknown> {
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
      issue: [{ severity: 'error', code: 'not-found', diagnostics: `FHIR 资源不存在：${kind}/${id}` }],
    },
    404,
  );
}

export const fhirServiceRequestRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/ServiceRequest',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoServiceRequests)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/ServiceRequest/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoServiceRequests)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/ServiceRequest/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('ServiceRequest', c.params.id);
      const found = demoServiceRequests.find((s) => s.id === c.params.id);
      if (!found) return operationOutcomeNotFound('ServiceRequest', c.params.id);
      return json(found);
    },
  },
];
