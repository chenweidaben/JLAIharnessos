/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Procedure 资源（脱敏演示数据） */
interface FhirProcedure {
  resourceType: 'Procedure';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown';
  code: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  subject: { reference: string };
  encounter?: { reference: string };
  performedDateTime?: string;
  performer?: Array<{ actor: { reference: string; display?: string } }>;
  outcome?: { coding: Array<{ system: string; code: string; display: string }>; text: string };
}

const demoProcedures: FhirProcedure[] = [
  {
    resourceType: 'Procedure',
    id: 'PRC-001',
    meta: { versionId: '1', lastUpdated: '2026-10-20T15:30:00+08:00' },
    status: 'completed',
    code: { coding: [{ system: 'http://snomed.info/sct', code: '71388002', display: '冠状动脉造影术' }], text: '冠状动脉造影术' },
    subject: { reference: 'Patient/P-001' },
    encounter: { reference: 'Encounter/ENC-001' },
    performedDateTime: '2026-10-20T10:00:00+08:00',
    performer: [{ actor: { reference: 'Practitioner/DR-001', display: '心内科主任医师' } }],
    outcome: { coding: [{ system: 'http://snomed.info/sct', code: '385655002', display: '手术成功' }], text: '手术成功，无并发症' },
  },
  {
    resourceType: 'Procedure',
    id: 'PRC-002',
    meta: { versionId: '1', lastUpdated: '2026-11-01T11:00:00+08:00' },
    status: 'completed',
    code: { coding: [{ system: 'http://snomed.info/sct', code: '236167002', display: '二甲双胍初始用药指导' }], text: '糖尿病用药指导门诊操作' },
    subject: { reference: 'Patient/P-002' },
    encounter: { reference: 'Encounter/ENC-002' },
    performedDateTime: '2026-11-01T09:30:00+08:00',
    performer: [{ actor: { reference: 'Practitioner/DR-002', display: '内分泌科副主任医师' } }],
    outcome: { coding: [{ system: 'http://snomed.info/sct', code: '385655002', display: '操作成功' }], text: '患者已掌握用药方法' },
  },
  {
    resourceType: 'Procedure',
    id: 'PRC-003',
    meta: { versionId: '1', lastUpdated: '2026-11-03T10:00:00+08:00' },
    status: 'in-progress',
    code: { coding: [{ system: 'http://snomed.info/sct', code: '185389009', display: '随访检查' }], text: '高血压门诊随访' },
    subject: { reference: 'Patient/P-001' },
    performedDateTime: '2026-11-03T08:15:00+08:00',
    performer: [{ actor: { reference: 'Practitioner/DR-001', display: '心内科主任医师' } }],
  },
];

function applySearch(q: URLSearchParams, list: FhirProcedure[]): FhirProcedure[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((p) => p.subject.reference === `Patient/${patient}`);
  const code = q.get('code');
  if (code) out = out.filter((p) => p.code.coding.some((c) => c.code === code));
  return out;
}

function toBundle(resources: FhirProcedure[]): Record<string, unknown> {
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

export const fhirProcedureRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Procedure',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoProcedures)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Procedure/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoProcedures)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Procedure/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Procedure', c.params.id);
      const found = demoProcedures.find((p) => p.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Procedure', c.params.id);
      return json(found);
    },
  },
];
