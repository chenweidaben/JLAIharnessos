/** 健澜科技：P1 FHIR R4 资源出口（M86-I）。DEMO_MODE 下返回标准 FHIR R4 JSON 结构。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Patient 资源（脱敏演示数据，姓名/证件/电话均打码） */
interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  active: boolean;
  identifier: Array<{ system: string; value: string }>;
  name: Array<{ use: string; family: string; given: string[]; text: string }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  telecom: Array<{ system: string; value: string; use: string }>;
  address: Array<{ use: string; line: string[]; city: string; state: string; postalCode: string }>;
}

const demoPatients: FhirPatient[] = [
  {
    resourceType: 'Patient',
    id: 'P-001',
    meta: { versionId: '3', lastUpdated: '2026-11-02T10:15:00+08:00' },
    active: true,
    identifier: [
      { system: 'urn:oid:1.2.840.114350.1.1', value: 'MRN-2026-0001' },
      { system: 'http://hospital.example.org/identifier/healthcard', value: '3301**********0011' },
    ],
    name: [{ use: 'official', family: '张', given: ['**'], text: '张**' }],
    gender: 'male',
    birthDate: '1955-03-12',
    telecom: [{ system: 'phone', value: '138****1234', use: 'mobile' }],
    address: [{ use: 'home', line: ['杭州市余杭区****街道'], city: '杭州', state: '浙江省', postalCode: '311100' }],
  },
  {
    resourceType: 'Patient',
    id: 'P-002',
    meta: { versionId: '2', lastUpdated: '2026-11-01T09:40:00+08:00' },
    active: true,
    identifier: [
      { system: 'urn:oid:1.2.840.114350.1.1', value: 'MRN-2026-0002' },
      { system: 'http://hospital.example.org/identifier/healthcard', value: '3301**********0028' },
    ],
    name: [{ use: 'official', family: '李', given: ['**'], text: '李**' }],
    gender: 'female',
    birthDate: '1962-07-25',
    telecom: [{ system: 'phone', value: '139****5678', use: 'mobile' }],
    address: [{ use: 'home', line: ['杭州市西湖区****小区'], city: '杭州', state: '浙江省', postalCode: '310012' }],
  },
  {
    resourceType: 'Patient',
    id: 'P-003',
    meta: { versionId: '1', lastUpdated: '2026-11-03T08:05:00+08:00' },
    active: true,
    identifier: [
      { system: 'urn:oid:1.2.840.114350.1.1', value: 'MRN-2026-0003' },
    ],
    name: [{ use: 'official', family: '王', given: ['**'], text: '王**' }],
    gender: 'male',
    birthDate: '1978-11-02',
    telecom: [{ system: 'phone', value: '137****9012', use: 'mobile' }],
    address: [{ use: 'home', line: ['杭州市拱墅区****路'], city: '杭州', state: '浙江省', postalCode: '310011' }],
  },
  {
    resourceType: 'Patient',
    id: 'P-004',
    meta: { versionId: '1', lastUpdated: '2026-10-30T16:20:00+08:00' },
    active: false,
    identifier: [
      { system: 'urn:oid:1.2.840.114350.1.1', value: 'MRN-2026-0004' },
    ],
    name: [{ use: 'official', family: '赵', given: ['**'], text: '赵**' }],
    gender: 'female',
    birthDate: '1985-01-20',
    telecom: [{ system: 'phone', value: '136****3456', use: 'mobile' }],
    address: [{ use: 'home', line: ['杭州市滨江区****公寓'], city: '杭州', state: '浙江省', postalCode: '310051' }],
  },
];

/** 应用 FHIR 标准 search 参数过滤 */
function applySearch(q: URLSearchParams, list: FhirPatient[]): FhirPatient[] {
  let out = list;
  const gender = q.get('gender');
  if (gender) out = out.filter((p) => p.gender === gender);
  const birthdate = q.get('birthdate');
  if (birthdate) out = out.filter((p) => p.birthDate === birthdate);
  const lastUpdated = q.get('_lastUpdated');
  if (lastUpdated) out = out.filter((p) => p.meta.lastUpdated.startsWith(lastUpdated));
  return out;
}

/** 拼装 FHIR R4 Bundle（searchset） */
function toBundle(resources: FhirPatient[]): Record<string, unknown> {
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

export const fhirPatientRoutes: RouteDef[] = [
  // 注意：静态路径 _search 必须排在 :id 之前，避免被参数路由吞并
  {
    method: 'GET',
    path: '/fhir/r4/Patient',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoPatients)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Patient/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      // FHIR 标准 search 交互（GET 形式）：与列表一致，支持 _search 语义
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoPatients)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Patient/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Patient', c.params.id);
      const found = demoPatients.find((p) => p.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Patient', c.params.id);
      return json(found);
    },
  },
];
