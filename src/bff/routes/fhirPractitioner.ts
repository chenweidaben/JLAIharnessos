/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Practitioner 资源（脱敏演示数据） */
interface FhirPractitioner {
  resourceType: 'Practitioner';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  active: boolean;
  identifier: Array<{ system: string; value: string }>;
  name: Array<{ use: string; family: string; given: string[]; text: string }>;
  telecom: Array<{ system: string; value: string; use: string }>;
  qualification: Array<{
    code: { coding: Array<{ system: string; code: string; display: string }>; text: string };
    period?: { start: string };
  }>;
}

const demoPractitioners: FhirPractitioner[] = [
  {
    resourceType: 'Practitioner',
    id: 'S-001',
    meta: { versionId: '3', lastUpdated: '2026-11-02T10:00:00+08:00' },
    active: true,
    identifier: [{ system: 'urn:oid:2.16.840.1.113883.2.4.6.10', value: 'DOC-2026-0001' }],
    name: [{ use: 'official', family: '张', given: ['**'], text: '张**' }],
    telecom: [{ system: 'phone', value: '0571-********801', use: 'work' }],
    qualification: [
      {
        code: {
          coding: [{ system: 'urn:oid:2.16.840.1.113883.2.4.6.10', code: '主任医师', display: '主任医师' }],
          text: '主任医师·心血管内科',
        },
        period: { start: '2003-07-01' },
      },
    ],
  },
  {
    resourceType: 'Practitioner',
    id: 'S-002',
    meta: { versionId: '2', lastUpdated: '2026-11-01T14:30:00+08:00' },
    active: true,
    identifier: [{ system: 'urn:oid:2.16.840.1.113883.2.4.6.10', value: 'DOC-2026-0002' }],
    name: [{ use: 'official', family: '李', given: ['**'], text: '李**' }],
    telecom: [{ system: 'phone', value: '0571-********802', use: 'work' }],
    qualification: [
      {
        code: {
          coding: [{ system: 'urn:oid:2.16.840.1.113883.2.4.6.10', code: '副主任医师', display: '副主任医师' }],
          text: '副主任医师·医学影像科',
        },
        period: { start: '2010-08-01' },
      },
    ],
  },
  {
    resourceType: 'Practitioner',
    id: 'S-003',
    meta: { versionId: '1', lastUpdated: '2026-10-28T09:15:00+08:00' },
    active: true,
    identifier: [{ system: 'urn:oid:2.16.840.1.113883.2.4.6.10', value: 'DOC-2026-0003' }],
    name: [{ use: 'official', family: '王', given: ['**'], text: '王**' }],
    telecom: [{ system: 'phone', value: '0571-********803', use: 'work' }],
    qualification: [
      {
        code: {
          coding: [{ system: 'urn:oid:2.16.840.1.113883.2.4.6.10', code: '主治医师', display: '主治医师' }],
          text: '主治医师·检验科',
        },
        period: { start: '2016-09-01' },
      },
    ],
  },
];

function applySearch(q: URLSearchParams, list: FhirPractitioner[]): FhirPractitioner[] {
  let out = list;
  const lastUpdated = q.get('_lastUpdated');
  if (lastUpdated) out = out.filter((p) => p.meta.lastUpdated.startsWith(lastUpdated));
  return out;
}

function toBundle(resources: FhirPractitioner[]): Record<string, unknown> {
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

export const fhirPractitionerRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Practitioner',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoPractitioners)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Practitioner/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoPractitioners)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Practitioner/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Practitioner', c.params.id);
      const found = demoPractitioners.find((p) => p.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Practitioner', c.params.id);
      return json(found);
    },
  },
];
