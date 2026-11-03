/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 CarePlan 资源（脱敏演示数据） */
interface FhirCarePlan {
  resourceType: 'CarePlan';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'option' | 'directive';
  title: string;
  description?: string;
  subject: { reference: string };
  encounter?: { reference: string };
  period?: { start: string; end?: string };
  activity?: Array<{
    detail: {
      code?: { coding: Array<{ system: string; code: string; display: string }>; text: string };
      status: 'not-started' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';
      description?: string;
      scheduledString?: string;
    };
  }>;
  goal?: Array<{ reference: string }>;
}

const demoCarePlans: FhirCarePlan[] = [
  {
    resourceType: 'CarePlan',
    id: 'CP-001',
    meta: { versionId: '2', lastUpdated: '2026-11-03T09:30:00+08:00' },
    status: 'active',
    intent: 'plan',
    title: '高血压慢病管理计划',
    description: '针对 P-001 收缩压偏高的 12 周血压管理与生活方式干预。',
    subject: { reference: 'Patient/P-001' },
    encounter: { reference: 'Encounter/ENC-001' },
    period: { start: '2026-11-03T00:00:00+08:00', end: '2027-01-26T23:59:59+08:00' },
    activity: [
      {
        detail: {
          code: { coding: [{ system: 'http://snomed.info/sct', code: '225358003', display: '血压监测' }], text: '每日早晚自测血压并记录' },
          status: 'in-progress',
          scheduledString: '每日 2 次，连续 12 周',
        },
      },
      {
        detail: {
          code: { coding: [{ system: 'http://snomed.info/sct', code: '410290004', display: '低钠饮食指导' }], text: '低盐饮食（每日 < 5g 盐）' },
          status: 'not-started',
          scheduledString: '长期执行',
        },
      },
      {
        detail: {
          code: { coding: [{ system: 'http://snomed.info/sct', code: '386053000', display: '有氧运动建议' }], text: '每周 5 次中等强度有氧运动 30 分钟' },
          status: 'not-started',
        },
      },
    ],
    goal: [{ reference: 'Goal/G-001' }],
  },
  {
    resourceType: 'CarePlan',
    id: 'CP-002',
    meta: { versionId: '1', lastUpdated: '2026-11-02T11:00:00+08:00' },
    status: 'active',
    intent: 'plan',
    title: '2 型糖尿病初始管理计划',
    description: '针对 P-002 新诊断 2 型糖尿病的血糖控制与用药启动。',
    subject: { reference: 'Patient/P-002' },
    encounter: { reference: 'Encounter/ENC-002' },
    period: { start: '2026-11-02T00:00:00+08:00' },
    activity: [
      {
        detail: {
          code: { coding: [{ system: 'http://snomed.info/sct', code: '182860008', display: '血糖监测' }], text: '空腹及餐后 2h 血糖监测' },
          status: 'in-progress',
          scheduledString: '每周 3 天，每天 4 次',
        },
      },
      {
        detail: {
          code: { coding: [{ system: 'http://snomed.info/sct', code: '410290004', display: '饮食控制' }], text: '糖尿病饮食宣教（碳水控制）' },
          status: 'scheduled',
          scheduledString: '2 周后营养科门诊',
        },
      },
    ],
    goal: [{ reference: 'Goal/G-002' }],
  },
  {
    resourceType: 'CarePlan',
    id: 'CP-003',
    meta: { versionId: '1', lastUpdated: '2026-10-25T16:00:00+08:00' },
    status: 'completed',
    intent: 'plan',
    title: '冠脉造影术后随访计划',
    description: 'P-001 冠脉造影术后 4 周恢复随访。',
    subject: { reference: 'Patient/P-001' },
    period: { start: '2026-10-20T00:00:00+08:00', end: '2026-11-17T23:59:59+08:00' },
    activity: [
      {
        detail: {
          code: { coding: [{ system: 'http://snomed.info/sct', code: '185389009', display: '术后随访' }], text: '术后 4 周心内科门诊复查' },
          status: 'completed',
        },
      },
    ],
    goal: [],
  },
];

function applySearch(q: URLSearchParams, list: FhirCarePlan[]): FhirCarePlan[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((c) => c.subject.reference === `Patient/${patient}`);
  const status = q.get('status');
  if (status) out = out.filter((c) => c.status === status);
  return out;
}

function toBundle(resources: FhirCarePlan[]): Record<string, unknown> {
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

export const fhirCarePlanRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/CarePlan',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoCarePlans)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/CarePlan/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoCarePlans)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/CarePlan/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('CarePlan', c.params.id);
      const found = demoCarePlans.find((cp) => cp.id === c.params.id);
      if (!found) return operationOutcomeNotFound('CarePlan', c.params.id);
      return json(found);
    },
  },
];
