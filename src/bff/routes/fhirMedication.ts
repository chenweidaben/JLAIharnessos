/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Medication 资源（脱敏演示数据） */
interface FhirMedication {
  resourceType: 'Medication';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'active' | 'inactive' | 'entered-in-error' | 'unknown';
  code: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  form?: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  ingredient?: Array<{ itemCodeableConcept: { coding: Array<{ system: string; code: string; display: string }>; text: string }; strength?: { value: number; unit: string; system: string; code: string } }>;
}

const demoMedications: FhirMedication[] = [
  {
    resourceType: 'Medication',
    id: 'MED-001',
    meta: { versionId: '1', lastUpdated: '2026-10-28T11:00:00+08:00' },
    status: 'active',
    code: { coding: [{ system: 'http://www.whocc.no/atc', code: 'C08CA02', display: '苯磺酸氨氯地平片' }], text: '苯磺酸氨氯地平片' },
    form: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/medication-form-codes', code: '421027003', display: '口服片剂' }], text: '口服片剂' },
    ingredient: [
      { itemCodeableConcept: { coding: [{ system: 'http://www.whocc.no/atc', code: 'C08CA02', display: '氨氯地平' }], text: '氨氯地平' }, strength: { value: 5, unit: 'mg', system: 'http://unitsofmeasure.org', code: 'mg' } },
    ],
  },
  {
    resourceType: 'Medication',
    id: 'MED-002',
    meta: { versionId: '1', lastUpdated: '2026-10-28T11:05:00+08:00' },
    status: 'active',
    code: { coding: [{ system: 'http://www.whocc.no/atc', code: 'A10BA02', display: '盐酸二甲双胍缓释片' }], text: '盐酸二甲双胍缓释片' },
    form: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/medication-form-codes', code: '421027003', display: '口服片剂' }], text: '口服缓释片' },
    ingredient: [
      { itemCodeableConcept: { coding: [{ system: 'http://www.whocc.no/atc', code: 'A10BA02', display: '二甲双胍' }], text: '二甲双胍' }, strength: { value: 500, unit: 'mg', system: 'http://unitsofmeasure.org', code: 'mg' } },
    ],
  },
  {
    resourceType: 'Medication',
    id: 'MED-003',
    meta: { versionId: '1', lastUpdated: '2026-10-29T09:20:00+08:00' },
    status: 'active',
    code: { coding: [{ system: 'http://www.whocc.no/atc', code: 'B01AC06', display: '阿司匹林肠溶片' }], text: '阿司匹林肠溶片' },
    form: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/medication-form-codes', code: '421027003', display: '口服片剂' }], text: '口服肠溶片' },
    ingredient: [
      { itemCodeableConcept: { coding: [{ system: 'http://www.whocc.no/atc', code: 'B01AC06', display: '阿司匹林' }], text: '阿司匹林' }, strength: { value: 100, unit: 'mg', system: 'http://unitsofmeasure.org', code: 'mg' } },
    ],
  },
];

function applySearch(q: URLSearchParams, list: FhirMedication[]): FhirMedication[] {
  let out = list;
  const code = q.get('code');
  if (code) out = out.filter((m) => m.code.coding.some((c) => c.code === code));
  return out;
}

function toBundle(resources: FhirMedication[]): Record<string, unknown> {
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

export const fhirMedicationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Medication',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoMedications)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Medication/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoMedications)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Medication/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Medication', c.params.id);
      const found = demoMedications.find((m) => m.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Medication', c.params.id);
      return json(found);
    },
  },
];
