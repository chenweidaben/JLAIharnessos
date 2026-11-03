/** 健澜科技：P1 FHIR R4 资源出口（M86-I）。DEMO_MODE 下返回标准 FHIR R4 JSON 结构。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 MedicationRequest 资源（关联 Patient + Encounter 演示数据） */
interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped' | 'draft' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'option' | 'instance-order';
  priority: 'routine' | 'urgent' | 'stat';
  medicationCodeableConcept: {
    coding: Array<{ system: string; code: string; display: string }>;
    text: string;
  };
  subject: { reference: string; display?: string };
  encounter?: { reference: string };
  authoredOn: string;
  dosageInstruction: Array<{
    text: string;
    timing: { repeat: { frequency: number; period: number; periodUnit: 'd' | 'h' | 'min' } };
    route: { coding: Array<{ code: string; display: string }>; text: string };
    doseAndRate: Array<{ doseQuantity: { value: number; unit: string; system: string; code: string } }>;
  }>;
  dispenseRequest: {
    quantity: { value: number; unit: string };
    expectedSupplyDuration: { value: number; unit: string };
  };
}

const demoMedicationRequests: FhirMedicationRequest[] = [
  {
    resourceType: 'MedicationRequest',
    id: 'MR-001',
    meta: { versionId: '2', lastUpdated: '2026-11-03T09:00:00+08:00' },
    status: 'active',
    intent: 'order',
    priority: 'routine',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.whocc.no/atc', code: 'C09AA01-X', display: '示例降压药物A' }],
      text: '示例降压药物A',
    },
    subject: { reference: 'Patient/P-001', display: '张**' },
    encounter: { reference: 'Encounter/ENC-001' },
    authoredOn: '2026-11-01T10:30:00+08:00',
    dosageInstruction: [
      {
        text: '10mg 口服 每日一次',
        timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } },
        route: { coding: [{ code: 'PO', display: '口服' }], text: '口服' },
        doseAndRate: [
          { doseQuantity: { value: 10, unit: 'mg', system: 'http://unitsofmeasure.org', code: 'mg' } },
        ],
      },
    ],
    dispenseRequest: {
      quantity: { value: 7, unit: '片' },
      expectedSupplyDuration: { value: 7, unit: 'd' },
    },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'MR-002',
    meta: { versionId: '1', lastUpdated: '2026-11-02T11:00:00+08:00' },
    status: 'completed',
    intent: 'order',
    priority: 'routine',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.whocc.no/atc', code: 'J01DD-X', display: '示例抗菌药物B' }],
      text: '示例抗菌药物B',
    },
    subject: { reference: 'Patient/P-001', display: '张**' },
    encounter: { reference: 'Encounter/ENC-001' },
    authoredOn: '2026-11-01T11:00:00+08:00',
    dosageInstruction: [
      {
        text: '1.5g 静脉滴注 每12小时一次',
        timing: { repeat: { frequency: 2, period: 1, periodUnit: 'd' } },
        route: { coding: [{ code: 'IV', display: '静脉注射' }], text: '静脉滴注' },
        doseAndRate: [
          { doseQuantity: { value: 1.5, unit: 'g', system: 'http://unitsofmeasure.org', code: 'g' } },
        ],
      },
    ],
    dispenseRequest: {
      quantity: { value: 4, unit: '袋' },
      expectedSupplyDuration: { value: 2, unit: 'd' },
    },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'MR-003',
    meta: { versionId: '3', lastUpdated: '2026-11-02T09:30:00+08:00' },
    status: 'active',
    intent: 'order',
    priority: 'routine',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.whocc.no/atc', code: 'A10BA-X', display: '示例降糖药物C' }],
      text: '示例降糖药物C',
    },
    subject: { reference: 'Patient/P-002', display: '李**' },
    encounter: { reference: 'Encounter/ENC-003' },
    authoredOn: '2026-10-28T14:00:00+08:00',
    dosageInstruction: [
      {
        text: '0.5g 口服 每日两次',
        timing: { repeat: { frequency: 2, period: 1, periodUnit: 'd' } },
        route: { coding: [{ code: 'PO', display: '口服' }], text: '口服' },
        doseAndRate: [
          { doseQuantity: { value: 0.5, unit: 'g', system: 'http://unitsofmeasure.org', code: 'g' } },
        ],
      },
    ],
    dispenseRequest: {
      quantity: { value: 14, unit: '片' },
      expectedSupplyDuration: { value: 7, unit: 'd' },
    },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'MR-004',
    meta: { versionId: '1', lastUpdated: '2026-11-03T08:40:00+08:00' },
    status: 'active',
    intent: 'order',
    priority: 'stat',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.whocc.no/atc', code: 'C01AA-X', display: '示例强心药物D' }],
      text: '示例强心药物D',
    },
    subject: { reference: 'Patient/P-003', display: '王**' },
    encounter: { reference: 'Encounter/ENC-004' },
    authoredOn: '2026-11-03T08:35:00+08:00',
    dosageInstruction: [
      {
        text: '0.2mg 静脉推注 立即',
        timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } },
        route: { coding: [{ code: 'IV', display: '静脉注射' }], text: '静脉推注' },
        doseAndRate: [
          { doseQuantity: { value: 0.2, unit: 'mg', system: 'http://unitsofmeasure.org', code: 'mg' } },
        ],
      },
    ],
    dispenseRequest: {
      quantity: { value: 1, unit: '支' },
      expectedSupplyDuration: { value: 1, unit: 'd' },
    },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'MR-005',
    meta: { versionId: '1', lastUpdated: '2026-10-29T10:00:00+08:00' },
    status: 'cancelled',
    intent: 'order',
    priority: 'routine',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.whocc.no/atc', code: 'N02BE-X', display: '示例镇痛药物E' }],
      text: '示例镇痛药物E',
    },
    subject: { reference: 'Patient/P-002', display: '李**' },
    encounter: { reference: 'Encounter/ENC-003' },
    authoredOn: '2026-10-29T10:00:00+08:00',
    dosageInstruction: [
      {
        text: '0.5g 口服 必要时',
        timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } },
        route: { coding: [{ code: 'PO', display: '口服' }], text: '口服' },
        doseAndRate: [
          { doseQuantity: { value: 0.5, unit: 'g', system: 'http://unitsofmeasure.org', code: 'g' } },
        ],
      },
    ],
    dispenseRequest: {
      quantity: { value: 6, unit: '片' },
      expectedSupplyDuration: { value: 3, unit: 'd' },
    },
  },
];

function applySearch(q: URLSearchParams, list: FhirMedicationRequest[]): FhirMedicationRequest[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((m) => m.subject.reference === `Patient/${patient}`);
  const status = q.get('status');
  if (status) out = out.filter((m) => m.status === status);
  return out;
}

function toBundle(resources: FhirMedicationRequest[]): Record<string, unknown> {
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

export const fhirMedicationRequestRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/MedicationRequest',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoMedicationRequests)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/MedicationRequest/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('MedicationRequest', c.params.id);
      const found = demoMedicationRequests.find((m) => m.id === c.params.id);
      if (!found) return operationOutcomeNotFound('MedicationRequest', c.params.id);
      return json(found);
    },
  },
];
