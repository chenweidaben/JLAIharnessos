/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Immunization 资源（脱敏演示数据） */
interface FhirImmunization {
  resourceType: 'Immunization';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'completed' | 'entered-in-error' | 'not-done';
  vaccineCode: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  patient: { reference: string };
  encounter?: { reference: string };
  occurrenceDateTime: string;
  lotNumber?: string;
  site?: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  performer?: Array<{ actor: { reference: string; display?: string } }>;
}

const demoImmunizations: FhirImmunization[] = [
  {
    resourceType: 'Immunization',
    id: 'IMM-001',
    meta: { versionId: '1', lastUpdated: '2026-10-15T10:00:00+08:00' },
    status: 'completed',
    vaccineCode: { coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '213', display: '流感灭活疫苗' }], text: '流感灭活疫苗（2026-2027 季度）' },
    patient: { reference: 'Patient/P-001' },
    occurrenceDateTime: '2026-10-15T09:30:00+08:00',
    lotNumber: 'FLU26-****',
    site: { coding: [{ system: 'http://snomed.info/sct', code: '368208006', display: '左上臂' }], text: '左上臂三角肌' },
    performer: [{ actor: { reference: 'Practitioner/DR-003', display: '预防接种门诊医师' } }],
  },
  {
    resourceType: 'Immunization',
    id: 'IMM-002',
    meta: { versionId: '1', lastUpdated: '2026-09-20T14:00:00+08:00' },
    status: 'completed',
    vaccineCode: { coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '210', display: '重组带状疱疹疫苗' }], text: '重组带状疱疹疫苗（第二剂）' },
    patient: { reference: 'Patient/P-001' },
    occurrenceDateTime: '2026-09-20T14:00:00+08:00',
    lotNumber: 'HZV26-****',
    site: { coding: [{ system: 'http://snomed.info/sct', code: '368208006', display: '左上臂' }], text: '左上臂三角肌' },
  },
  {
    resourceType: 'Immunization',
    id: 'IMM-003',
    meta: { versionId: '1', lastUpdated: '2026-10-22T11:00:00+08:00' },
    status: 'completed',
    vaccineCode: { coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '213', display: '流感灭活疫苗' }], text: '流感灭活疫苗（2026-2027 季度）' },
    patient: { reference: 'Patient/P-002' },
    occurrenceDateTime: '2026-10-22T10:30:00+08:00',
    lotNumber: 'FLU26-****',
    site: { coding: [{ system: 'http://snomed.info/sct', code: '368208006', display: '右上臂' }], text: '右上臂三角肌' },
  },
];

function applySearch(q: URLSearchParams, list: FhirImmunization[]): FhirImmunization[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((i) => i.patient.reference === `Patient/${patient}`);
  return out;
}

function toBundle(resources: FhirImmunization[]): Record<string, unknown> {
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

export const fhirImmunizationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Immunization',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoImmunizations)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Immunization/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoImmunizations)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Immunization/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Immunization', c.params.id);
      const found = demoImmunizations.find((i) => i.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Immunization', c.params.id);
      return json(found);
    },
  },
];
