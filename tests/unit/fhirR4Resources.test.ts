/**
 * 健澜AI原生医院操作系统OS - P1-8 FHIR R4 资源扩展 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore,
  SUPPORTED_RESOURCES,
  createResource,
  getResource,
  listResources,
  updateResource,
  FhirR4Error,
} from '../../src/bff/aggregators/fhirR4ResourcesAggregator';

const DOCTOR = ['doctor'];
const PATIENT_ME = { roles: ['patient'], id: 'P-ME' };
const ADMIN = ['admin'];

beforeEach(() => { __resetStore(); });

function statusOf(fn: () => unknown): number {
  try { fn(); return 0; } catch (e) { return (e as FhirR4Error).status; }
}

/** 患者作用域资源的样例体（带 subject/patient/beneficiary 指向 P-ME） */
function bodyFor(rt: string, pid = 'P-ME'): Record<string, unknown> {
  const base: Record<string, unknown> = { resourceType: rt, id: `${rt}-1`, status: 'active' };
  if (['Patient', 'Practitioner', 'PractitionerRole', 'Location', 'Organization'].includes(rt)) return base;
  if (rt === 'Coverage' || rt === 'ExplanationOfBenefit') { base.beneficiary = { reference: `Patient/${pid}` }; return base; }
  base.subject = { reference: `Patient/${pid}` };
  return base;
}

describe('P1-8 白名单规模与不支持类型', () => {
  test('支持 24 类资源（含原 4 类）', () => {
    expect(SUPPORTED_RESOURCES.length).toBe(24);
    for (const must of ['Patient', 'Encounter', 'Observation', 'MedicationRequest', 'Condition', 'DiagnosticReport', 'ServiceRequest']) {
      expect((SUPPORTED_RESOURCES as readonly string[])).toContain(must);
    }
  });
  test('不支持的 resourceType → 404', () => {
    expect(statusOf(() => listResources('NotAResource', DOCTOR, 'd1'))).toBe(404);
  });
});

describe('P1-8 24 类 round-trip（doctor 视角）', () => {
  for (const rt of SUPPORTED_RESOURCES) {
    test(`${rt} POST→GET 字段一致`, () => {
      const body = bodyFor(rt);
      const created = createResource(rt, body, DOCTOR, 'd1');
      expect(created.resourceType).toBe(rt);
      expect(created.id).toBe(`${rt}-1`);
      expect((created as { meta: { lastUpdated: string } }).meta.lastUpdated).toBeTruthy();
      const got = getResource(rt, `${rt}-1`, DOCTOR, 'd1');
      expect(got.id).toBe(`${rt}-1`);
    });
  }
});

describe('P1-8 校验与冲突', () => {
  test('POST 缺 resourceType → 400', () => {
    expect(statusOf(() => createResource('Condition', { id: 'x' } as never, DOCTOR, 'd1'))).toBe(400);
  });
  test('body.resourceType 与路径不一致 → 400', () => {
    expect(statusOf(() => createResource('Condition', { resourceType: 'Observation', id: 'x' }, DOCTOR, 'd1'))).toBe(400);
  });
  test('重复 POST 同 id → 409', () => {
    createResource('Condition', bodyFor('Condition'), DOCTOR, 'd1');
    expect(statusOf(() => createResource('Condition', bodyFor('Condition'), DOCTOR, 'd1'))).toBe(409);
  });
  test('PUT 更新不存在 id → 404', () => {
    expect(statusOf(() => updateResource('Condition', 'nope', bodyFor('Condition'), DOCTOR, 'd1'))).toBe(404);
  });
  test('GET 不存在 id → 404', () => {
    expect(statusOf(() => getResource('Condition', 'nope', DOCTOR, 'd1'))).toBe(404);
  });
});

describe('P1-8 行级患者绑定', () => {
  test('patient 角色访问他人 Condition → 403', () => {
    createResource('Condition', bodyFor('Condition', 'P-OTHER'), ADMIN, 'admin');
    expect(statusOf(() => getResource('Condition', 'Condition-1', PATIENT_ME.roles, PATIENT_ME.id))).toBe(403);
  });
  test('patient 角色访问自己 Condition → 200', () => {
    createResource('Condition', bodyFor('Condition', 'P-ME'), ADMIN, 'admin');
    expect(getResource('Condition', 'Condition-1', PATIENT_ME.roles, PATIENT_ME.id).id).toBe('Condition-1');
  });
  test('patient 列表只返回自己的资源', () => {
    const a = bodyFor('Condition', 'P-ME'); a.id = 'C-ME';
    const b = bodyFor('Condition', 'P-OTHER'); b.id = 'C-OTHER';
    createResource('Condition', a, ADMIN, 'admin');
    createResource('Condition', b, ADMIN, 'admin');
    const list = listResources('Condition', PATIENT_ME.roles, PATIENT_ME.id);
    expect(list.total).toBe(1);
  });
  test('管理类资源 Practitioner 不强制患者绑定', () => {
    const p = createResource('Practitioner', { resourceType: 'Practitioner', id: 'doc-1', active: true }, PATIENT_ME.roles, PATIENT_ME.id);
    expect(p.id).toBe('doc-1');
  });
});

describe('P1-8 PUT 幂等更新', () => {
  test('PUT 后字段更新', () => {
    createResource('Patient', { resourceType: 'Patient', id: 'P-U', active: true, gender: 'male' }, ADMIN, 'admin');
    const updated = updateResource('Patient', 'P-U', { resourceType: 'Patient', id: 'P-U', active: true, gender: 'female' }, ADMIN, 'admin');
    expect(updated.gender).toBe('female');
  });
});
