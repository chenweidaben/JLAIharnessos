/**
 * 健澜AI原生医院操作系统OS - P0-7 收尾深化 单测
 *
 * 覆盖：demo 口令哈希校验（正确/错误/未知用户）、
 * assertCan 不再凭 admin 角色硬绕过（permissions=[] → 403，permissions=['*'] → 放行）、
 * 既有 doctor/nurse/pharmacist 角色放行不受影响。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, test } from 'bun:test';
import { verifyDemoPassword } from '../../src/bff/routes/auth';
import { assertCan, OrderCpoeError } from '../../src/bff/aggregators/orderCpoeAggregator';

describe('P0-7 demo 口令哈希', () => {
  test('正确口令 → true', () => {
    expect(verifyDemoPassword('demo-doctor', 'Demo@Doctor1')).toBe(true);
    expect(verifyDemoPassword('demo-admin', 'Demo@Admin1')).toBe(true);
  });
  test('错误口令 → false', () => {
    expect(verifyDemoPassword('demo-doctor', 'wrong')).toBe(false);
  });
  test('未知用户 → false', () => {
    expect(verifyDemoPassword('nobody', 'any')).toBe(false);
  });
});

describe('P0-7 admin 不再凭角色硬绕过', () => {
  test('admin 角色但 permissions=[] → write 403', () => {
    let s = 0;
    try { assertCan({ roles: ['admin'], permissions: [] }, 'write'); }
    catch (e) { s = (e as OrderCpoeError).status; }
    expect(s).toBe(403);
  });
  test('admin 角色 permissions=[*] → write 放行', () => {
    expect(() => assertCan({ roles: ['admin'], permissions: ['*'] }, 'write')).not.toThrow();
  });
  test('admin 角色 permissions=[] → review 403', () => {
    let s = 0;
    try { assertCan({ roles: ['admin'], permissions: [] }, 'review'); }
    catch (e) { s = (e as OrderCpoeError).status; }
    expect(s).toBe(403);
  });
  test('admin 角色 permissions=[] → execute 403', () => {
    let s = 0;
    try { assertCan({ roles: ['admin'], permissions: [] }, 'execute'); }
    catch (e) { s = (e as OrderCpoeError).status; }
    expect(s).toBe(403);
  });
  test('permissions=[*] → review/execute 均放行', () => {
    expect(() => assertCan({ roles: [], permissions: ['*'] }, 'review')).not.toThrow();
    expect(() => assertCan({ roles: [], permissions: ['*'] }, 'execute')).not.toThrow();
  });
});

describe('P0-7 既有角色放行不受影响', () => {
  test('doctor write 放行', () => {
    expect(() => assertCan({ roles: ['doctor'], permissions: [] }, 'write')).not.toThrow();
  });
  test('nurse execute 放行', () => {
    expect(() => assertCan({ roles: ['nurse'], permissions: [] }, 'execute')).not.toThrow();
  });
  test('pharmacist review 放行', () => {
    expect(() => assertCan({ roles: ['pharmacist'], permissions: [] }, 'review')).not.toThrow();
  });
  test('空角色空权限 → write 403', () => {
    let s = 0;
    try { assertCan({ roles: [], permissions: [] }, 'write'); }
    catch (e) { s = (e as OrderCpoeError).status; }
    expect(s).toBe(403);
  });
});
