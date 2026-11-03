/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 DiagnosticReport 资源（脱敏演示数据） */
interface FhirDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
  code: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  subject: { reference: string };
  encounter?: { reference: string };
  issued: string;
  conclusion?: string;
  conclusionCode?: Array<{ coding: Array<{ system: string; code: string; display: string }>; text: string }>;
  result: Array<{ reference: string; display?: string }>;
}

const demoReports: FhirDiagnosticReport[] = [
  {
    resourceType: 'DiagnosticReport',
    id: 'DR-001',
    meta: { versionId: '2', lastUpdated: '2026-11-03T09:00:00+08:00' },
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: '生命体征全套' }], text: '生命体征全套' },
    subject: { reference: 'Patient/P-001' },
    encounter: { reference: 'Encounter/ENC-001' },
    issued: '2026-11-03T08:45:00+08:00',
    conclusion: '心率正常，收缩压偏高，建议监测血压变化。',
    conclusionCode: [{ coding: [{ system: 'http://snomed.info/sct', code: '38341003', display: '高血压' }], text: '高血压（疑似）' }],
    result: [
      { reference: 'Observation/OB-001', display: '心率' },
      { reference: 'Observation/OB-002', display: '收缩压' },
    ],
  },
  {
    resourceType: 'DiagnosticReport',
    id: 'DR-002',
    meta: { versionId: '1', lastUpdated: '2026-11-02T10:30:00+08:00' },
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '24323-8', display: '糖尿病筛查全套' }], text: '糖尿病筛查全套' },
    subject: { reference: 'Patient/P-002' },
    encounter: { reference: 'Encounter/ENC-002' },
    issued: '2026-11-02T10:15:00+08:00',
    conclusion: '糖化血红蛋白与空腹血糖均偏高，符合 2 型糖尿病诊断标准。',
    conclusionCode: [{ coding: [{ system: 'http://snomed.info/sct', code: '44054006', display: '2型糖尿病' }], text: '2型糖尿病' }],
    result: [
      { reference: 'Observation/OB-003', display: '糖化血红蛋白' },
      { reference: 'Observation/OB-004', display: '空腹血糖' },
    ],
  },
  {
    resourceType: 'DiagnosticReport',
    id: 'DR-003',
    meta: { versionId: '1', lastUpdated: '2026-11-01T15:00:00+08:00' },
    status: 'preliminary',
    code: { coding: [{ system: 'http://loinc.org', code: '58410-2', display: '血常规' }], text: '血常规五分类' },
    subject: { reference: 'Patient/P-003' },
    issued: '2026-11-01T14:40:00+08:00',
    conclusion: '白细胞计数轻度升高，建议结合临床症状复查。',
    result: [],
  },
];

function applySearch(q: URLSearchParams, list: FhirDiagnosticReport[]): FhirDiagnosticReport[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((r) => r.subject.reference === `Patient/${patient}`);
  const code = q.get('code');
  if (code) out = out.filter((r) => r.code.coding.some((c) => c.code === code));
  return out;
}

function toBundle(resources: FhirDiagnosticReport[]): Record<string, unknown> {
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

export const fhirDiagnosticReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/DiagnosticReport',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoReports)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/DiagnosticReport/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoReports)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/DiagnosticReport/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('DiagnosticReport', c.params.id);
      const found = demoReports.find((r) => r.id === c.params.id);
      if (!found) return operationOutcomeNotFound('DiagnosticReport', c.params.id);
      return json(found);
    },
  },
];
