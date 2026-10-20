/**
 * 健澜科技 jlmedaios - FHIR 标准 API 网关
 *
 * 提供 HL7 FHIR R4 格式的医疗资源接口，用于互联互通/区域平台对接。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/fhir/Patient/:id
 * 返回 HL7 FHIR Patient 资源
 */
async function handlePatient(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const id = c.params?.id ?? 'patient-001';

  const patient = {
    resourceType: 'Patient',
    id,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
    },
    text: {
      status: 'generated',
      div: `<div>演示患者 ${id}</div>`,
    },
    active: true,
    name: [
      {
        family: '演示',
        given: ['患者A'],
        use: 'official',
      },
    ],
    gender: 'male',
    birthDate: '1980-01-01',
    telecom: [
      {
        system: 'phone',
        value: '13800138000',
        use: 'mobile',
      },
    ],
    address: [
      {
        use: 'home',
        line: ['杭州市西湖区'],
        city: '杭州市',
        state: '浙江省',
        postalCode: '310000',
      },
    ],
  };

  return json(ok(patient));
}

/**
 * GET /api/fhir/Encounter/:id
 * 返回就诊记录
 */
async function handleEncounter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const id = c.params?.id ?? 'encounter-001';

  const encounter = {
    resourceType: 'Encounter',
    id,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
    },
    status: 'finished',
    class: {
      code: 'IMP',
      display: '住院',
    },
    subject: {
      reference: 'Patient/patient-001',
    },
    period: {
      start: '2026-10-15T09:00:00Z',
      end: '2026-10-19T10:00:00Z',
    },
    serviceProvider: {
      reference: 'Organization/hospital-001',
      display: '健澜科技数智医院',
    },
  };

  return json(ok(encounter));
}

/**
 * GET /api/fhir/Observation?patient=:id
 * 返回检验体征
 */
async function handleObservation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patientId = c.query.get('patient') ?? 'patient-001';

  const observations = [
    {
      resourceType: 'Observation',
      id: 'obs-001',
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8867-4',
            display: '心率',
          },
        ],
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      valueQuantity: {
        value: 72,
        unit: '次/分',
        system: 'http://unitsofmeasure.org',
        code: '/min',
      },
      effectiveDateTime: new Date().toISOString(),
    },
    {
      resourceType: 'Observation',
      id: 'obs-002',
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8480-6',
            display: '收缩压',
          },
        ],
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      valueQuantity: {
        value: 120,
        unit: 'mmHg',
        system: 'http://unitsofmeasure.org',
        code: 'mm[Hg]',
      },
      effectiveDateTime: new Date().toISOString(),
    },
  ];

  const bundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: observations.length,
    entry: observations.map((obs) => ({ resource: obs })),
  };

  return json(ok(bundle));
}

/**
 * GET /api/fhir/MedicationRequest?patient=:id
 * 返回用药
 */
async function handleMedicationRequest(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patientId = c.query.get('patient') ?? 'patient-001';

  const medicationRequests = [
    {
      resourceType: 'MedicationRequest',
      id: 'med-001',
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: [
          {
            system: 'http://www.whocc.no/atc',
            code: 'C09AA01',
            display: '依那普利',
          },
        ],
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      authoredOn: new Date().toISOString(),
      dosageInstruction: [
        {
          text: '10mg 口服 每日一次',
          timing: {
            repeat: {
              frequency: 1,
              period: 1,
              periodUnit: 'd',
            },
          },
          doseAndRate: [
            {
              doseQuantity: {
                value: 10,
                unit: 'mg',
              },
            },
          ],
        },
      ],
    },
  ];

  const bundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: medicationRequests.length,
    entry: medicationRequests.map((mr) => ({ resource: mr })),
  };

  return json(ok(bundle));
}

export const fhirRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/fhir/Patient/:id',
    handle: handlePatient,
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/fhir/Encounter/:id',
    handle: handleEncounter,
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/fhir/Observation',
    handle: handleObservation,
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/fhir/MedicationRequest',
    handle: handleMedicationRequest,
    auth: true,
  },
];
