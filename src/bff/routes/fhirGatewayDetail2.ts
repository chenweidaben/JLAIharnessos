/**
 * 健澜科技 jlmedaios - FHIR R4 第二批资源搜索（M432 DEMO_MODE=1 短路）
 *
 * GET /api/v1/fhir/DocumentReference/search
 * GET /api/v1/fhir/MedicationDispense/search
 * GET /api/v1/fhir/ServiceRequest/search
 * GET /api/v1/fhir/Location/search
 * GET /api/v1/fhir/Practitioner/search
 * GET /api/v1/fhir/Organization/search
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function bundle(builder: (i: number) => Record<string, unknown>, n = 5) {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: n,
    entry: Array.from({ length: n }, (_, i) => ({
      resource: { id: `fhir2-${i + 1}`, ...builder(i + 1) },
    })),
  };
}

export const fhirGatewayDetail2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/fhir/DocumentReference/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(bundle((n) => ({ resourceType: 'DocumentReference', subject: { reference: `Patient/pat-${n}` }, type: { coding: [{ code: `DOC-${n}` }] }, date: new Date(Date.now() - n * 3600000).toISOString(), status: n % 2 === 0 ? 'current' : 'superseded' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/MedicationDispense/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(bundle((n) => ({ resourceType: 'MedicationDispense', subject: { reference: `Patient/pat-${n}` }, medication: { coding: [{ code: `MED-${n}` }] }, whenHandedOut: new Date(Date.now() - n * 3600000).toISOString(), status: n % 2 === 0 ? 'completed' : 'preparation' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/ServiceRequest/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(bundle((n) => ({ resourceType: 'ServiceRequest', subject: { reference: `Patient/pat-${n}` }, code: { coding: [{ code: `SRV-${n}` }] }, intent: n % 2 === 0 ? 'order' : 'proposal', status: n % 2 === 0 ? 'active' : 'draft' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/Location/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(bundle((n) => ({ resourceType: 'Location', name: `location-${n}`, type: { coding: [{ code: `LOC-${n}` }] }, address: { city: `city-${n}` }, status: n % 2 === 0 ? 'active' : 'inactive' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/Practitioner/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(bundle((n) => ({ resourceType: 'Practitioner', name: [{ family: `李${n}`, given: [`医${n}`] }], role: { coding: [{ code: `ROLE-${n}` }] }, qualification: [{ code: { coding: [{ code: `QUAL-${n}` }] } }], active: n % 2 === 0 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/Organization/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(bundle((n) => ({ resourceType: 'Organization', name: `org-${n}`, type: { coding: [{ code: `ORG-${n}` }] }, partOf: n > 1 ? { reference: 'Organization/org-1' } : undefined, active: n % 2 === 0 })))),
  },
];