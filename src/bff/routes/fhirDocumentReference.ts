/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 DocumentReference 资源（脱敏演示数据） */
interface FhirDocumentReference {
  resourceType: 'DocumentReference';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'current' | 'superseded' | 'entered-in-error';
  type: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  subject: { reference: string; display: string };
  date: string;
  author: Array<{ reference: string; display: string }>;
  description: string;
  content: Array<{ attachment: { contentType: string; url: string; title: string } }>;
}

const demoDocumentReferences: FhirDocumentReference[] = [
  {
    resourceType: 'DocumentReference',
    id: 'DOC-001',
    meta: { versionId: '1', lastUpdated: '2026-11-02T11:30:00+08:00' },
    status: 'current',
    type: {
      coding: [{ system: 'http://loinc.org', code: '18748-4', display: 'Diagnostic imaging report' }],
      text: 'CT 影像诊断报告',
    },
    subject: { reference: 'Patient/P-001', display: '张**' },
    date: '2026-11-02T11:30:00+08:00',
    author: [{ reference: 'Practitioner/S-002', display: '李**' }],
    description: '胸部 CT 平扫诊断报告',
    content: [{ attachment: { contentType: 'application/pdf', url: 'https://demo.jianlan.example/fhir/bin/DOC-001.pdf', title: '胸部CT诊断报告.pdf' } }],
  },
  {
    resourceType: 'DocumentReference',
    id: 'DOC-002',
    meta: { versionId: '1', lastUpdated: '2026-11-01T16:00:00+08:00' },
    status: 'current',
    type: {
      coding: [{ system: 'http://loinc.org', code: '11502-2', display: 'Physician study note' }],
      text: '门诊病历记录',
    },
    subject: { reference: 'Patient/P-001', display: '张**' },
    date: '2026-11-01T16:00:00+08:00',
    author: [{ reference: 'Practitioner/S-001', display: '张**' }],
    description: '心血管内科门诊病历',
    content: [{ attachment: { contentType: 'application/pdf', url: 'https://demo.jianlan.example/fhir/bin/DOC-002.pdf', title: '门诊病历.pdf' } }],
  },
  {
    resourceType: 'DocumentReference',
    id: 'DOC-003',
    meta: { versionId: '1', lastUpdated: '2026-10-30T09:00:00+08:00' },
    status: 'current',
    type: {
      coding: [{ system: 'http://loinc.org', code: '11502-2', display: 'Physician study note' }],
      text: '住院病历摘要',
    },
    subject: { reference: 'Patient/P-002', display: '李**' },
    date: '2026-10-30T09:00:00+08:00',
    author: [{ reference: 'Practitioner/S-001', display: '张**' }],
    description: '住院病历摘要（出院小结）',
    content: [{ attachment: { contentType: 'application/pdf', url: 'https://demo.jianlan.example/fhir/bin/DOC-003.pdf', title: '出院小结.pdf' } }],
  },
];

function applySearch(q: URLSearchParams, list: FhirDocumentReference[]): FhirDocumentReference[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((d) => d.subject.reference === `Patient/${patient}`);
  const type = q.get('type');
  if (type) out = out.filter((d) => d.type.coding.some((c) => c.code === type));
  return out;
}

function toBundle(resources: FhirDocumentReference[]): Record<string, unknown> {
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

export const fhirDocumentReferenceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/DocumentReference',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoDocumentReferences)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/DocumentReference/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoDocumentReferences)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/DocumentReference/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('DocumentReference', c.params.id);
      const found = demoDocumentReferences.find((d) => d.id === c.params.id);
      if (!found) return operationOutcomeNotFound('DocumentReference', c.params.id);
      return json(found);
    },
  },
];
