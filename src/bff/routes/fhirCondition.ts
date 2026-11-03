/** 健澜科技：P1 FHIR R4 资源出口（M86-I）。DEMO_MODE 下返回标准 FHIR R4 JSON 结构。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 Condition 资源（关联 Patient 演示数据） */
interface FhirCondition {
  resourceType: 'Condition';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  clinicalStatus: {
    coding: Array<{ system: string; code: 'active' | 'recurrence' | 'inactive' | 'resolved' | 'remission'; display: string }>;
    text: string;
  };
  verificationStatus: {
    coding: Array<{ system: string; code: 'unconfirmed' | 'provisional' | 'differential' | 'confirmed' | 'refuted' | 'entered-in-error'; display: string }>;
    text: string;
  };
  category: Array<{ coding: Array<{ system: string; code: string; display: string }>; text: string }>;
  severity?: { coding: Array<{ system: string; code: 'mild' | 'moderate' | 'severe'; display: string }>; text: string };
  code: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  subject: { reference: string; display?: string };
  encounter?: { reference: string };
  onsetDateTime?: string;
  abatementDateTime?: string;
  note?: Array<{ text: string }>;
}

const demoConditions: FhirCondition[] = [
  {
    resourceType: 'Condition',
    id: 'COND-001',
    meta: { versionId: '2', lastUpdated: '2026-11-01T09:20:00+08:00' },
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
      text: '活动',
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }],
      text: '已确诊',
    },
    category: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis', display: 'Encounter Diagnosis' }],
        text: '入院诊断',
      },
    ],
    severity: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-severity', code: 'moderate', display: 'Moderate' }],
      text: '中度',
    },
    code: {
      coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'I10', display: '原发性高血压' }],
      text: '原发性高血压（2级，高危）',
    },
    subject: { reference: 'Patient/P-001', display: '张**' },
    encounter: { reference: 'Encounter/ENC-001' },
    onsetDateTime: '2020-05-10T00:00:00+08:00',
    note: [{ text: '病程 6 年，规律服药，本次入院血压控制不佳。' }],
  },
  {
    resourceType: 'Condition',
    id: 'COND-002',
    meta: { versionId: '1', lastUpdated: '2026-11-01T09:25:00+08:00' },
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
      text: '活动',
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }],
      text: '已确诊',
    },
    category: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis', display: 'Encounter Diagnosis' }],
        text: '入院诊断',
      },
    ],
    severity: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-severity', code: 'mild', display: 'Mild' }],
      text: '轻度',
    },
    code: {
      coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9', display: '2型糖尿病' }],
      text: '2型糖尿病（无并发症）',
    },
    subject: { reference: 'Patient/P-001', display: '张**' },
    encounter: { reference: 'Encounter/ENC-001' },
    onsetDateTime: '2022-03-15T00:00:00+08:00',
  },
  {
    resourceType: 'Condition',
    id: 'COND-003',
    meta: { versionId: '1', lastUpdated: '2026-10-28T10:30:00+08:00' },
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'resolved', display: 'Resolved' }],
      text: 'resolved',
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }],
      text: '已确诊',
    },
    category: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis', display: 'Encounter Diagnosis' }],
        text: '入院诊断',
      },
    ],
    code: {
      coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'J18.9', display: '肺炎' }],
      text: '社区获得性肺炎',
    },
    subject: { reference: 'Patient/P-002', display: '李**' },
    encounter: { reference: 'Encounter/ENC-003' },
    onsetDateTime: '2026-10-26T00:00:00+08:00',
    abatementDateTime: '2026-11-01T00:00:00+08:00',
  },
  {
    resourceType: 'Condition',
    id: 'COND-004',
    meta: { versionId: '1', lastUpdated: '2026-11-03T08:20:00+08:00' },
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
      text: '活动',
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'provisional', display: 'Provisional' }],
      text: '待证实',
    },
    category: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis', display: 'Encounter Diagnosis' }],
        text: '初步诊断',
      },
    ],
    severity: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-severity', code: 'severe', display: 'Severe' }],
      text: '重度',
    },
    code: {
      coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'I21.9', display: '急性心肌梗死' }],
      text: '急性非ST段抬高型心肌梗死',
    },
    subject: { reference: 'Patient/P-003', display: '王**' },
    encounter: { reference: 'Encounter/ENC-004' },
    onsetDateTime: '2026-11-03T07:50:00+08:00',
    note: [{ text: '急诊送入，待心电图及心肌酶谱结果进一步确认。' }],
  },
];

function applySearch(q: URLSearchParams, list: FhirCondition[]): FhirCondition[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((c) => c.subject.reference === `Patient/${patient}`);
  const clinicalStatus = q.get('clinical-status');
  if (clinicalStatus) {
    out = out.filter((c) =>
      c.clinicalStatus.coding.some((x) => x.code === clinicalStatus),
    );
  }
  return out;
}

function toBundle(resources: FhirCondition[]): Record<string, unknown> {
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

export const fhirConditionRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/Condition',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoConditions)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/Condition/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('Condition', c.params.id);
      const found = demoConditions.find((cond) => cond.id === c.params.id);
      if (!found) return operationOutcomeNotFound('Condition', c.params.id);
      return json(found);
    },
  },
];
