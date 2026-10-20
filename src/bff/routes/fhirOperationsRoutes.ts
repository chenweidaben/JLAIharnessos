/**
 * 健澜科技 jlmedaios - FHIR R4 网关操作端点（M430 DEMO_MODE=1 短路）
 *
 * POST   /api/v1/fhir/Patient             创建患者资源
 * PUT    /api/v1/fhir/Patient/:id          更新患者资源
 * GET    /api/v1/fhir/Patient/search        患者条件检索
 * POST   /api/v1/fhir/Patient/$validate    患者资源校验
 * PATCH  /api/v1/fhir/Patient/:id          患者资源补丁更新
 * GET    /api/v1/fhir/Patient/:id/_history  患者资源版本历史
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

export const fhirOperationsRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/fhir/Patient',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ resourceType: 'Patient', id: 'patient-new-001', meta: { versionId: '1', lastUpdated: new Date().toISOString() } })),
  },
  {
    method: 'PUT',
    path: '/api/v1/fhir/Patient/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => json(ok({ resourceType: 'Patient', id: c.params.id, version: '2', meta: { versionId: '2' } })),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/Patient/search',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 5,
      entry: Array.from({ length: 5 }, (_, i) => ({
        resource: { id: `patient-${i + 1}`, resourceType: 'Patient', name: [{ family: `张${i + 1}` }], gender: i % 2 === 0 ? 'male' : 'female', active: true },
      })),
    })),
  },
  {
    method: 'POST',
    path: '/api/v1/fhir/Patient/$validate',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ issues: [{ severity: 'information', code: 'ok', diagnostics: 'Resource valid' }] })),
  },
  {
    method: 'PATCH',
    path: '/api/v1/fhir/Patient/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => json(ok({ id: c.params.id, updatedFields: ['name', 'active'] })),
  },
  {
    method: 'GET',
    path: '/api/v1/fhir/Patient/:id/_history',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => json(ok({
      id: c.params.id,
      history: Array.from({ length: 3 }, (_, i) => ({ version: `${i + 1}`, lastUpdated: new Date(Date.now() - (3 - i) * 86400000).toISOString(), author: `system-${i + 1}` })),
    })),
  },
];