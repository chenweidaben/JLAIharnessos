/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 MedicationAdministration 资源（脱敏演示数据） */
interface FhirMedicationAdministration {
  resourceType: 'MedicationAdministration';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'in-progress' | 'not-done' | 'on-hold' | 'completed' | 'cancelled' | 'entered-in-error' | 'stopped' | 'unknown';
  medicationCodeableConcept: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  subject: { reference: string; display: string };
  effectivePeriod: { start: string; end: string };
  dosage: { text: string; route: { coding: Array<{ system: string; code: string; display: string }> } };
  performer: Array<{ actor: { reference: string; display: string } }>;
}

const demoMedicationAdministrations: FhirMedicationAdministration[] = [
  {
    resourceType: 'MedicationAdministration',
    id: 'ADM-001',
    meta: { versionId: '1', lastUpdated: '2026-11-02T08:30:00+08:00' },
    status: 'completed',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '313979', display: 'Amlodipine 5 MG Oral Tablet' }],
      text: '苯磺酸氨氯地平片 5mg 口服',
    },
    subject: { reference: 'Patient/P-001', display: '张**' },
    effectivePeriod: { start: '2026-11-02T08:00:00+08:00', end: '2026-11-02T08:05:00+08:00' },
    dosage: {
      text: '5mg 口服 qd',
      route: { coding: [{ system: 'http://snomed.info/sct', code: '26643006', display: 'Oral route' }] },
    },
    performer: [{ actor: { reference: 'Practitioner/S-001', display: '张**' } }],
  },
  {
    resourceType: 'MedicationAdministration',
    id: 'ADM-002',
    meta: { versionId: '1', lastUpdated: '2026-11-02T14:15:00+08:00' },
    status: 'completed',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '831132', display: 'Metformin 500 MG Oral Tablet' }],
      text: '盐酸二甲双胍片 0.5g 口服',
    },
    subject: { reference: 'Patient/P-001', display: '张**' },
    effectivePeriod: { start: '2026-11-02T14:00:00+08:00', end: '2026-11-02T14:05:00+08:00' },
    dosage: {
      text: '0.5g 口服 bid（餐后）',
      route: { coding: [{ system: 'http://snomed.info/sct', code: '26643006', display: 'Oral route' }] },
    },
    performer: [{ actor: { reference: 'Practitioner/S-003', display: '王**' } }],
  },
  {
    resourceType: 'MedicationAdministration',
    id: 'ADM-003',
    meta: { versionId: '1', lastUpdated: '2026-11-04T09:00:00+08:00' },
    status: 'in-progress',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '104492', display: 'Ceftriaxone 2 G Injection' }],
      text: '注射用头孢曲松钠 2g 静滴',
    },
    subject: { reference: 'Patient/P-002', display: '李**' },
    effectivePeriod: { start: '2026-11-04T09:00:00+08:00', end: '2026-11-04T09:30:00+08:00' },
    dosage: {
      text: '2g 静脉滴注 qd',
      route: { coding: [{ system: 'http://snomed.info/sct', code: '47625008', display: 'Intravenous route' }] },
    },
    performer: [{ actor: { reference: 'Practitioner/S-001', display: '张**' } }],
  },
];

function applySearch(q: URLSearchParams, list: FhirMedicationAdministration[]): FhirMedicationAdministration[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((m) => m.subject.reference === `Patient/${patient}`);
  const status = q.get('status');
  if (status) out = out.filter((m) => m.status === status);
  return out;
}

function toBundle(resources: FhirMedicationAdministration[]): Record<string, unknown> {
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

export const fhirMedicationAdministrationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/MedicationAdministration',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoMedicationAdministrations)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/MedicationAdministration/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoMedicationAdministrations)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/MedicationAdministration/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('MedicationAdministration', c.params.id);
      const found = demoMedicationAdministrations.find((m) => m.id === c.params.id);
      if (!found) return operationOutcomeNotFound('MedicationAdministration', c.params.id);
      return json(found);
    },
  },
];
