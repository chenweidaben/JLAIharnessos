/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Organization 资源（脱敏演示数据） */
interface FhirOrganization {
  resourceType: 'Organization';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  active: boolean;
  name: string;
  alias: string[];
  telecom: Array<{ system: string; value: string; use: string }>;
  address: Array<{ use: string; line: string[]; city: string; state: string; postalCode: string }>;
  partOf: { reference: string; display: string } | null;
}

const demoOrganizations: FhirOrganization[] = [
  {
    resourceType: 'Organization',
    id: 'ORG-001',
    meta: { versionId: '1', lastUpdated: '2026-11-01T08:00:00+08:00' },
    active: true,
    name: '健澜科技示范医院',
    alias: ['健澜示范医院'],
    telecom: [{ system: 'phone', value: '0571-********000', use: 'work' }],
    address: [{ use: 'work', line: ['杭州市余杭区****路 100 号'], city: '杭州', state: '浙江省', postalCode: '311100' }],
    partOf: null,
  },
  {
    resourceType: 'Organization',
    id: 'ORG-002',
    meta: { versionId: '1', lastUpdated: '2026-11-01T08:05:00+08:00' },
    active: true,
    name: '健澜科技示范医院-心血管内科',
    alias: ['心内科'],
    telecom: [{ system: 'phone', value: '0571-********101', use: 'work' }],
    address: [{ use: 'work', line: ['杭州市余杭区****路 100 号 住院部 5F'], city: '杭州', state: '浙江省', postalCode: '311100' }],
    partOf: { reference: 'Organization/ORG-001', display: '健澜科技示范医院' },
  },
  {
    resourceType: 'Organization',
    id: 'ORG-003',
    meta: { versionId: '1', lastUpdated: '2026-11-01T08:10:00+08:00' },
    active: true,
    name: '健澜科技示范医院-医学影像中心',
    alias: ['影像中心'],
    telecom: [{ system: 'phone', value: '0571-********201', use: 'work' }],
    address: [{ use: 'work', line: ['杭州市余杭区****路 100 号 门诊楼 2F'], city: '杭州', state: '浙江省', postalCode: '311100' }],
    partOf: { reference: 'Organization/ORG-001', display: '健澜科技示范医院' },
  },
];

function applySearch(q: URLSearchParams, list: FhirOrganization[]): FhirOrganization[] {
  let out = list;
  const name = q.get('name');
  if (name) out = out.filter((o) => o.name.includes(name));
  return out;
}

function toBundle(resources: FhirOrganization[]): Record<string, unknown> {
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

export const fhirOrganizationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Organization',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoOrganizations)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Organization/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoOrganizations)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Organization/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Organization', c.params.id);
      const found = demoOrganizations.find((o) => o.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Organization', c.params.id);
      return json(found);
    },
  },
];
