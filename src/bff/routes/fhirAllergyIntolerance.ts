/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 AllergyIntolerance 资源（脱敏演示数据） */
interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  clinicalStatus: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  verificationStatus: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  type?: 'allergy' | 'intolerance';
  category?: Array<'food' | 'medication' | 'environment' | 'biologic'>;
  criticality: 'low' | 'high' | 'unable-to-assess';
  code: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  patient: { reference: string };
  recordedDate?: string;
  reaction?: Array<{
    manifestation: Array<{ coding: Array<{ system: string; code: string; display: string }>; text: string }>;
    description?: string;
    severity?: 'mild' | 'moderate' | 'severe';
  }>;
}

const demoAllergies: FhirAllergyIntolerance[] = [
  {
    resourceType: 'AllergyIntolerance',
    id: 'ALL-001',
    meta: { versionId: '1', lastUpdated: '2026-08-10T09:00:00+08:00' },
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: '活动' }], text: '活动' },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed', display: '已确认' }], text: '已确认' },
    type: 'allergy',
    category: ['medication'],
    criticality: 'high',
    code: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '705', display: '青霉素类' }], text: '青霉素过敏' },
    patient: { reference: 'Patient/P-001' },
    recordedDate: '2026-08-10T09:00:00+08:00',
    reaction: [
      {
        manifestation: [{ coding: [{ system: 'http://snomed.info/sct', code: '271807003', display: '荨麻疹' }], text: '全身荨麻疹' }],
        description: '皮试阳性，既往使用青霉素后出现皮疹。',
        severity: 'moderate',
      },
    ],
  },
  {
    resourceType: 'AllergyIntolerance',
    id: 'ALL-002',
    meta: { versionId: '1', lastUpdated: '2026-09-05T15:00:00+08:00' },
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: '活动' }], text: '活动' },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed', display: '已确认' }], text: '已确认' },
    type: 'intolerance',
    category: ['food'],
    criticality: 'low',
    code: { coding: [{ system: 'http://snomed.info/sct', code: '235025005', display: '海鲜不耐受' }], text: '虾蟹类海鲜不耐受' },
    patient: { reference: 'Patient/P-002' },
    recordedDate: '2026-09-05T15:00:00+08:00',
    reaction: [
      {
        manifestation: [{ coding: [{ system: 'http://snomed.info/sct', code: '62315008', display: '腹泻' }], text: '进食后腹泻' }],
        description: '进食虾蟹后出现轻度腹泻，无皮疹。',
        severity: 'mild',
      },
    ],
  },
  {
    resourceType: 'AllergyIntolerance',
    id: 'ALL-003',
    meta: { versionId: '1', lastUpdated: '2026-10-01T10:30:00+08:00' },
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: '活动' }], text: '活动' },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'unconfirmed', display: '待确认' }], text: '待确认' },
    type: 'allergy',
    category: ['environment'],
    criticality: 'low',
    code: { coding: [{ system: 'http://snomed.info/sct', code: '300916004', display: '花粉症' }], text: '春季花粉过敏' },
    patient: { reference: 'Patient/P-003' },
    recordedDate: '2026-10-01T10:30:00+08:00',
    reaction: [
      {
        manifestation: [{ coding: [{ system: 'http://snomed.info/sct', code: '418309004', display: '过敏性鼻炎' }], text: '季节性鼻炎' }],
        severity: 'mild',
      },
    ],
  },
];

function applySearch(q: URLSearchParams, list: FhirAllergyIntolerance[]): FhirAllergyIntolerance[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((a) => a.patient.reference === `Patient/${patient}`);
  return out;
}

function toBundle(resources: FhirAllergyIntolerance[]): Record<string, unknown> {
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

export const fhirAllergyIntoleranceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/AllergyIntolerance',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoAllergies)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/AllergyIntolerance/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoAllergies)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/AllergyIntolerance/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('AllergyIntolerance', c.params.id);
      const found = demoAllergies.find((a) => a.id === c.params.id);
      if (!found) return operationOutcomeNotFound('AllergyIntolerance', c.params.id);
      return json(found);
    },
  },
];
