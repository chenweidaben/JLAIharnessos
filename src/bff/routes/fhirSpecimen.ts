/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Specimen 资源（脱敏演示数据） */
interface FhirSpecimen {
  resourceType: 'Specimen';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'available' | 'unavailable' | 'not-requested' | 'unsatisfactory' | 'entered-in-error';
  type: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  subject: { reference: string; display: string };
  receivedTime: string;
  collection: { collectedDateTime: string };
  container: Array<{ type: { coding: Array<{ system: string; code: string; display: string }>; text: string } }>;
}

const demoSpecimens: FhirSpecimen[] = [
  {
    resourceType: 'Specimen',
    id: 'SPM-001',
    meta: { versionId: '1', lastUpdated: '2026-11-01T10:30:00+08:00' },
    status: 'available',
    type: {
      coding: [{ system: 'http://snomed.info/sct', code: '122554006', display: 'Blood specimen' }],
      text: '静脉全血',
    },
    subject: { reference: 'Patient/P-001', display: '张**' },
    receivedTime: '2026-11-01T10:45:00+08:00',
    collection: { collectedDateTime: '2026-11-01T10:20:00+08:00' },
    container: [{ type: { coding: [{ system: 'http://snomed.info/sct', code: '43471002', display: 'Evacuated blood collection tube' }], text: 'EDTA 抗凝管' } }],
  },
  {
    resourceType: 'Specimen',
    id: 'SPM-002',
    meta: { versionId: '1', lastUpdated: '2026-11-01T10:35:00+08:00' },
    status: 'available',
    type: {
      coding: [{ system: 'http://snomed.info/sct', code: '122555007', display: 'Serum specimen' }],
      text: '血清',
    },
    subject: { reference: 'Patient/P-001', display: '张**' },
    receivedTime: '2026-11-01T11:00:00+08:00',
    collection: { collectedDateTime: '2026-11-01T10:25:00+08:00' },
    container: [{ type: { coding: [{ system: 'http://snomed.info/sct', code: '43471002', display: 'Evacuated blood collection tube' }], text: '促凝管' } }],
  },
  {
    resourceType: 'Specimen',
    id: 'SPM-003',
    meta: { versionId: '1', lastUpdated: '2026-11-04T14:50:00+08:00' },
    status: 'unavailable',
    type: {
      coding: [{ system: 'http://snomed.info/sct', code: '122560000', display: 'Urine specimen' }],
      text: '晨尿',
    },
    subject: { reference: 'Patient/P-002', display: '李**' },
    receivedTime: '2026-11-04T15:10:00+08:00',
    collection: { collectedDateTime: '2026-11-04T14:40:00+08:00' },
    container: [{ type: { coding: [{ system: 'http://snomed.info/sct', code: '258606007', display: 'Urine specimen container' }], text: '尿杯' } }],
  },
];

function applySearch(q: URLSearchParams, list: FhirSpecimen[]): FhirSpecimen[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((s) => s.subject.reference === `Patient/${patient}`);
  return out;
}

function toBundle(resources: FhirSpecimen[]): Record<string, unknown> {
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

export const fhirSpecimenRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Specimen',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoSpecimens)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Specimen/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoSpecimens)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Specimen/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Specimen', c.params.id);
      const found = demoSpecimens.find((s) => s.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Specimen', c.params.id);
      return json(found);
    },
  },
];
