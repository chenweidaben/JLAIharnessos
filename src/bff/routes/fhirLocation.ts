/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Location 资源（脱敏演示数据） */
interface FhirLocation {
  resourceType: 'Location';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'active' | 'suspended' | 'inactive';
  name: string;
  mode: 'instance' | 'kind';
  physicalType: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  address: { use: string; line: string[]; city: string; state: string; postalCode: string };
  managingOrganization: { reference: string; display: string };
}

const demoLocations: FhirLocation[] = [
  {
    resourceType: 'Location',
    id: 'LOC-001',
    meta: { versionId: '1', lastUpdated: '2026-11-01T08:20:00+08:00' },
    status: 'active',
    name: '门诊楼-心血管内科诊区',
    mode: 'instance',
    physicalType: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'ro', display: 'Room' }],
      text: '诊室',
    },
    address: { use: 'work', line: ['杭州市余杭区****路 100 号 门诊楼 3F'], city: '杭州', state: '浙江省', postalCode: '311100' },
    managingOrganization: { reference: 'Organization/ORG-002', display: '健澜科技示范医院-心血管内科' },
  },
  {
    resourceType: 'Location',
    id: 'LOC-002',
    meta: { versionId: '1', lastUpdated: '2026-11-01T08:25:00+08:00' },
    status: 'active',
    name: '影像中心-CT 室',
    mode: 'instance',
    physicalType: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'bd', display: 'Building' }],
      text: '检查室',
    },
    address: { use: 'work', line: ['杭州市余杭区****路 100 号 门诊楼 2F'], city: '杭州', state: '浙江省', postalCode: '311100' },
    managingOrganization: { reference: 'Organization/ORG-003', display: '健澜科技示范医院-医学影像中心' },
  },
  {
    resourceType: 'Location',
    id: 'LOC-003',
    meta: { versionId: '1', lastUpdated: '2026-10-25T10:00:00+08:00' },
    status: 'suspended',
    name: '住院部-ICU 病区 1 床',
    mode: 'instance',
    physicalType: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'bd', display: 'Bed' }],
      text: '病床',
    },
    address: { use: 'work', line: ['杭州市余杭区****路 100 号 住院部 8F'], city: '杭州', state: '浙江省', postalCode: '311100' },
    managingOrganization: { reference: 'Organization/ORG-001', display: '健澜科技示范医院' },
  },
];

function applySearch(q: URLSearchParams, list: FhirLocation[]): FhirLocation[] {
  let out = list;
  const name = q.get('name');
  if (name) out = out.filter((l) => l.name.includes(name));
  const status = q.get('status');
  if (status) out = out.filter((l) => l.status === status);
  return out;
}

function toBundle(resources: FhirLocation[]): Record<string, unknown> {
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

export const fhirLocationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Location',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoLocations)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Location/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoLocations)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Location/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Location', c.params.id);
      const found = demoLocations.find((l) => l.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Location', c.params.id);
      return json(found);
    },
  },
];
