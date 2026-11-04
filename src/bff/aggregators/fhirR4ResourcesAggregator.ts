/**
 * 健澜AI原生医院操作系统OS - P1-8 FHIR R4 资源扩展网关
 *
 * 统一 CRUD：/fhir/r4/{resourceType}/{id?}
 *  - GET  /{resourceType}        列表（Bundle searchset）
 *  - GET  /{resourceType}/{id}  单条
 *  - POST /{resourceType}       创建（id 冲突 409）
 *  - PUT  /{resourceType}/{id}  幂等更新（不存在 404）
 *
 * 24 类资源白名单；resourceType 不在白名单 → 404 OperationOutcome。
 * 每个资源必含 resourceType/id/meta.lastUpdated；POST 缺 resourceType → 400。
 * 患者作用域资源（subject/patient/beneficiary 引用 Patient/{pid}）与 JWT 患者不匹配 → 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class FhirR4Error extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** 管理类资源：不强制患者归属 */
const ADMIN_RESOURCES = new Set([
  'Practitioner', 'PractitionerRole', 'Location', 'Organization',
]);

/** 全量白名单（含原 4 类：Patient/Encounter/Observation/MedicationRequest） */
export const SUPPORTED_RESOURCES = [
  'Patient', 'Encounter', 'Observation', 'MedicationRequest',
  'Condition', 'Procedure', 'DocumentReference', 'Coverage',
  'ExplanationOfBenefit', 'AllergyIntolerance', 'AdverseEvent', 'CarePlan',
  'EpisodeOfCare', 'Flag', 'List', 'RelatedPerson',
  'Practitioner', 'PractitionerRole', 'Location', 'Organization',
  'DiagnosticReport', 'ServiceRequest', 'MedicationDispense', 'MedicationAdministration',
] as const;

export type ResourceType = (typeof SUPPORTED_RESOURCES)[number];

// resourceType -> (id -> resource)
const store = new Map<ResourceType, Map<string, Record<string, unknown>>>();
for (const rt of SUPPORTED_RESOURCES) store.set(rt, new Map());

function rtStore(rt: string): Map<string, Record<string, unknown>> {
  if (!(SUPPORTED_RESOURCES as readonly string[]).includes(rt)) {
    throw new FhirR4Error(404, 'not-supported', `不支持的 FHIR R4 资源类型：${rt}`);
  }
  return store.get(rt as ResourceType)!;
}

/** 从资源体中提取 Patient/{pid} 引用（subject/patient/beneficiary）。 */
function extractPatientId(res: Record<string, unknown>): string | null {
  const ref = (r: unknown): string | null => {
    if (r && typeof r === 'object') {
      const v = (r as Record<string, unknown>).reference;
      if (typeof v === 'string' && v.startsWith('Patient/')) return v.slice('Patient/'.length);
    }
    return null;
  };
  return (
    ref(res.subject) ?? ref(res.patient) ?? ref(res.beneficiary) ?? ref(res.instantiatesCanonical) ?? null
  );
}

function assertPatientAccess(rt: string, res: Record<string, unknown>, roles: string[], actorId: string): void {
  if (ADMIN_RESOURCES.has(rt) || rt === 'Patient') return;
  if (roles.includes('doctor') || roles.includes('nurse') || roles.includes('admin')) return;
  if (roles.includes('patient')) {
    const pid = extractPatientId(res);
    if (pid && pid !== actorId) {
      throw new FhirR4Error(403, 'forbidden', `患者 ${actorId} 无权访问 Patient/${pid} 的 ${rt} 资源`);
    }
  }
}

function stampMeta(res: Record<string, unknown>): Record<string, unknown> {
  const meta = (res.meta && typeof res.meta === 'object' ? { ...(res.meta as Record<string, unknown>) } : {}) as Record<string, unknown>;
  meta.lastUpdated = new Date().toISOString();
  if (!meta.versionId) meta.versionId = '1';
  res.meta = meta;
  return res;
}

// ---------- CRUD ----------
export function createResource(rt: string, body: Record<string, unknown>, roles: string[], actorId: string): Record<string, unknown> {
  const s = rtStore(rt);
  if (!body.resourceType) throw new FhirR4Error(400, 'bad', 'POST 体缺 resourceType');
  if (body.resourceType !== rt) throw new FhirR4Error(400, 'bad', `body.resourceType=${body.resourceType} 与路径 ${rt} 不一致`);
  const id = typeof body.id === 'string' && body.id ? body.id : `${rt}-${Date.now().toString(36)}`;
  if (s.has(id)) throw new FhirR4Error(409, 'conflict', `资源已存在：${rt}/${id}（重复 POST）`);
  const res = stampMeta({ ...body, id });
  assertPatientAccess(rt, res, roles, actorId);
  s.set(id, res);
  return res;
}

export function getResource(rt: string, id: string, roles: string[], actorId: string): Record<string, unknown> {
  const s = rtStore(rt);
  const res = s.get(id);
  if (!res) throw new FhirR4Error(404, 'not-found', `资源不存在：${rt}/${id}`);
  assertPatientAccess(rt, res, roles, actorId);
  return res;
}

export function listResources(rt: string, roles: string[], actorId: string): { resourceType: string; type: string; total: number; entry: Array<{ resource: unknown }> } {
  const s = rtStore(rt);
  let arr = [...s.values()];
  // patient 角色仅能看自己
  if (roles.includes('patient') && !roles.includes('doctor') && !roles.includes('nurse') && !roles.includes('admin')) {
    arr = arr.filter((r) => {
      const pid = extractPatientId(r);
      return pid === null || pid === actorId;
    });
  }
  return {
    resourceType: 'Bundle', type: 'searchset', total: arr.length,
    entry: arr.map((resource) => ({ resource })),
  };
}

export function updateResource(rt: string, id: string, body: Record<string, unknown>, roles: string[], actorId: string): Record<string, unknown> {
  const s = rtStore(rt);
  if (!s.has(id)) throw new FhirR4Error(404, 'not-found', `PUT 更新不存在的资源：${rt}/${id}`);
  const res = stampMeta({ ...body, id, resourceType: rt });
  assertPatientAccess(rt, res, roles, actorId);
  s.set(id, res);
  return res;
}

export function __resetStore(): void {
  for (const s of store.values()) s.clear();
}
