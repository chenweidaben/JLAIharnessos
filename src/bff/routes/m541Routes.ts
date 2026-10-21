/**
 * 健澜科技 jlmedaios - M541 新标准 P0：FHIR R4 网关（互联互通四甲核心）
 *
 * 仅新增 GET /api/v1/fhir/Patient/:id 一个端点（404 OperationOutcome）。
 *
 * 说明：GET /api/v1/fhir/Encounter 与 GET /api/v1/fhir/Observation
 * 已由 M265 批次（m265Routes.ts）注册并在线返回 R4 Bundle(searchset)，
 * 为避免重复路由遮蔽既有实现，本文件不重复注册这两个路径。
 *
 * 内存种子 3 个 Patient，不连 PostgreSQL，不抛 500。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [
        { severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` },
      ],
    },
    404,
  );
}

// ============================== 内存种子 ==============================

const patients: Record<string, Record<string, unknown>> = {
  P10001: {
    resourceType: 'Patient',
    id: 'P10001',
    meta: { versionId: '1', lastUpdated: '2026-10-21T00:00:00Z' },
    identifier: [{ system: 'http://hospital.example.cn/mrn', value: 'MRN-2026-001' }],
    name: [{ use: 'official', family: '张', given: ['建国'] }],
    gender: 'male',
    birthDate: '1958-03-15',
    address: [{ line: ['杭州市西湖区'], city: '杭州' }],
  },
  P10002: {
    resourceType: 'Patient',
    id: 'P10002',
    meta: { versionId: '1', lastUpdated: '2026-10-21T00:00:00Z' },
    identifier: [{ system: 'http://hospital.example.cn/mrn', value: 'MRN-2026-002' }],
    name: [{ use: 'official', family: '王', given: ['秀兰'] }],
    gender: 'female',
    birthDate: '1965-07-22',
    address: [{ line: ['杭州市拱墅区'], city: '杭州' }],
  },
  P10003: {
    resourceType: 'Patient',
    id: 'P10003',
    meta: { versionId: '1', lastUpdated: '2026-10-21T00:00:00Z' },
    identifier: [{ system: 'http://hospital.example.cn/mrn', value: 'MRN-2026-003' }],
    name: [{ use: 'official', family: '李', given: ['伟'] }],
    gender: 'male',
    birthDate: '1990-11-08',
    address: [{ line: ['杭州市滨江区'], city: '杭州' }],
  },
};

// ============================== GET /api/v1/fhir/Patient/:id ==============================

async function handlePatientGet(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const p = patients[id];
  if (!p) return notFound('Patient', id);
  return json(ok(p), 200);
}

export const m541Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fhir/Patient/:id', handle: handlePatientGet, auth: true },
];
