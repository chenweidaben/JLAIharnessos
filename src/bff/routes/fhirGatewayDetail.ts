/**
 * 健澜科技 jlmedaios - FHIR R4 网关深度接口（M430 DEMO_MODE=1 短路）
 *
 * GET /api/v1/fhir/Patient/search
 * GET /api/v1/fhir/Observation/search
 * GET /api/v1/fhir/Condition/search
 * GET /api/v1/fhir/MedicationRequest/search
 * GET /api/v1/fhir/Encounter/search
 * GET /api/v1/fhir/AllergyIntolerance/search
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function makeEntries(builder: (i: number) => Record<string, unknown>, n = 5) {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: Array.from({ length: n }, (_, i) => ({
      resource: { id: `fhir-${i + 1}`, ...builder(i + 1) },
    })),
  };
}

export const fhirGatewayDetailRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/fhir/Patient/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(makeEntries((n) => ({ resourceType: 'Patient', name: [{ family: `张${n}`, given: [`医${n}`] }], birthDate: `195${n}-0${n}-1${n}`, gender: n % 2 === 0 ? 'male' : 'female', active: true })))),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/Observation/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(makeEntries((n) => ({ resourceType: 'Observation', subject: { reference: `Patient/pat-${n}` }, code: { coding: [{ code: `LOINC-${n}` }] }, valueQuantity: { value: n * 2.1, unit: 'mg/dL' }, effectiveDateTime: new Date(Date.now() - n * 3600000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/Condition/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(makeEntries((n) => ({ resourceType: 'Condition', subject: { reference: `Patient/pat-${n}` }, code: { coding: [{ code: `SNOMED-${n}` }] }, severity: n % 2 === 0 ? 'mild' : 'severe', clinicalStatus: { coding: [{ code: n % 2 === 0 ? 'active' : 'resolved' }] } })))),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/MedicationRequest/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(makeEntries((n) => ({ resourceType: 'MedicationRequest', subject: { reference: `Patient/pat-${n}` }, status: n % 2 === 0 ? 'active' : 'completed', requester: { reference: `Practitioner/dr-${n}` }, intendedDosage: [{ doseAndRate: [{ doseQuantity: { value: n * 5, unit: 'mg' } }] }] })))),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/Encounter/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(makeEntries((n) => ({ resourceType: 'Encounter', subject: { reference: `Patient/pat-${n}` }, class: { coding: [{ code: `IMP-${n}` }] }, period: { start: new Date(Date.now() - n * 86400000).toISOString(), end: new Date(Date.now() - n * 86400000 + 3600000).toISOString() }, status: n % 2 === 0 ? 'finished' : 'in-progress' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/AllergyIntolerance/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(makeEntries((n) => ({ resourceType: 'AllergyIntolerance', patient: { reference: `Patient/pat-${n}` }, code: { coding: [{ code: `ALLERGY-${n}` }] }, criticalType: n % 2 === 0 ? 'low' : 'high', verificationStatus: { coding: [{ code: n % 2 === 0 ? 'confirmed' : 'unconfirmed' }] } })))),
  },
];