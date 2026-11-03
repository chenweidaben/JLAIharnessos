/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Observation 资源（脱敏演示数据） */
interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'cancelled' | 'entered-in-error' | 'unknown';
  category: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  code: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  subject: { reference: string };
  effectiveDateTime: string;
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  valueCodeableConcept?: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  interpretation?: Array<{ coding: Array<{ system: string; code: string; display: string }>; text: string }>;
}

const demoObservations: FhirObservation[] = [
  {
    resourceType: 'Observation',
    id: 'OB-001',
    meta: { versionId: '2', lastUpdated: '2026-11-03T08:30:00+08:00' },
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: '心率' }], text: '心率' },
    subject: { reference: 'Patient/P-001' },
    effectiveDateTime: '2026-11-03T08:15:00+08:00',
    valueQuantity: { value: 78, unit: '次/分', system: 'http://unitsofmeasure.org', code: '/min' },
    interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-interpretation', code: 'N', display: '正常' }], text: '正常' }],
  },
  {
    resourceType: 'Observation',
    id: 'OB-002',
    meta: { versionId: '1', lastUpdated: '2026-11-03T08:31:00+08:00' },
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: '收缩压' }], text: '收缩压' },
    subject: { reference: 'Patient/P-001' },
    effectiveDateTime: '2026-11-03T08:15:00+08:00',
    valueQuantity: { value: 142, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
    interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-interpretation', code: 'H', display: '偏高' }], text: '偏高' }],
  },
  {
    resourceType: 'Observation',
    id: 'OB-003',
    meta: { versionId: '1', lastUpdated: '2026-11-02T10:05:00+08:00' },
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: '糖化血红蛋白' }], text: '糖化血红蛋白' },
    subject: { reference: 'Patient/P-002' },
    effectiveDateTime: '2026-11-02T09:30:00+08:00',
    valueQuantity: { value: 6.8, unit: '%', system: 'http://unitsofmeasure.org', code: '%' },
    interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-interpretation', code: 'H', display: '偏高' }], text: '偏高' }],
  },
  {
    resourceType: 'Observation',
    id: 'OB-004',
    meta: { versionId: '1', lastUpdated: '2026-11-02T10:06:00+08:00' },
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '2339-0', display: '葡萄糖' }], text: '空腹血糖' },
    subject: { reference: 'Patient/P-002' },
    effectiveDateTime: '2026-11-02T09:30:00+08:00',
    valueQuantity: { value: 7.2, unit: 'mmol/L', system: 'http://unitsofmeasure.org', code: 'mmol/L' },
    interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-interpretation', code: 'H', display: '偏高' }], text: '偏高' }],
  },
];

function applySearch(q: URLSearchParams, list: FhirObservation[]): FhirObservation[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((o) => o.subject.reference === `Patient/${patient}`);
  const code = q.get('code');
  if (code) out = out.filter((o) => o.code.coding.some((c) => c.code === code));
  return out;
}

function toBundle(resources: FhirObservation[]): Record<string, unknown> {
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

export const fhirObservationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Observation',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoObservations)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Observation/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoObservations)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Observation/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Observation', c.params.id);
      const found = demoObservations.find((o) => o.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Observation', c.params.id);
      return json(found);
    },
  },
];
