/**
 * 健澜AI原生医院操作系统OS - P4-5 操作回放与取证包 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { __resetStore as resetAudit, recordEvent } from '../../src/bff/aggregators/auditEventAggregator';
import {
  __resetStore, createPackage, getPackage, packageToCsv, replay, validateQuery,
} from '../../src/bff/aggregators/forensicExportAggregator';

beforeEach(() => { resetAudit(); __resetStore(); });

function seed() {
  recordEvent({ actorId: 'D1', actorRole: 'doctor', action: 'create', module: 'emr', resourceType: 'note', resourceId: 'N1', patientId: 'P1', result: 'success', ip: '1.1.1.1', userAgent: 'ua' });
  recordEvent({ actorId: 'D1', actorRole: 'doctor', action: 'view', module: 'emr', resourceType: 'note', resourceId: 'N2', patientId: 'P1', result: 'success', ip: '1.1.1.1', userAgent: 'ua' });
  recordEvent({ actorId: 'D2', actorRole: 'doctor', action: 'update', module: 'cds', resourceType: 'check', resourceId: 'C1', patientId: 'P2', result: 'success', ip: '1.1.1.2', userAgent: 'ua' });
}

describe('P4-5 校验', () => {
  test('actorId 和 patientId 都不给 → 400', () => {
    expect(validateQuery({})).toMatch(/至少给一个/);
  });
  test('from 非法 ISO → 400', () => {
    expect(validateQuery({ actorId: 'D1', from: 'not-a-date' })).toMatch(/from/);
  });
  test('to 非法 ISO → 400', () => {
    expect(validateQuery({ actorId: 'D1', to: 'bad' })).toMatch(/to/);
  });
  test('合法查询 → null', () => {
    expect(validateQuery({ actorId: 'D1' })).toBeNull();
  });
});

describe('P4-5 回放', () => {
  test('按 actorId 回放 → 只返回该用户事件（正序）', () => {
    seed();
    const r = replay({ actorId: 'D1' });
    expect(r.total).toBe(2);
    expect(r.rows[0].actorId).toBe('D1');
    expect(r.rows[1].actorId).toBe('D1');
  });
  test('按 patientId 反查 → 返回所有访问该患者的操作', () => {
    seed();
    const r = replay({ patientId: 'P1' });
    expect(r.total).toBe(2);
  });
  test('limit/offset 分页', () => {
    seed();
    const r = replay({ actorId: 'D1', limit: 1, offset: 1 });
    expect(r.rows.length).toBe(1);
    expect(r.total).toBe(2);
  });
  test('正序（seq 递增）', () => {
    seed();
    const r = replay({ actorId: 'D1' });
    expect(r.rows[0].seq).toBeLessThan(r.rows[1].seq);
  });
});

describe('P4-5 取证包', () => {
  test('生成取证包 → 含 packageId + hashChainValid=true', () => {
    seed();
    const pkg = createPackage({ actorId: 'D1' }, 'ADMIN');
    expect(pkg.packageId).toMatch(/^FP-/);
    expect(pkg.hashChainValid).toBe(true);
    expect(pkg.eventCount).toBe(2);
    expect(pkg.events.length).toBe(2);
  });
  test('getPackage 命中；不存在 → null', () => {
    seed();
    const pkg = createPackage({ actorId: 'D1' }, 'ADMIN');
    expect(getPackage(pkg.packageId)?.packageId).toBe(pkg.packageId);
    expect(getPackage('FP-nope')).toBeNull();
  });
  test('空结果也生成包（eventCount=0, hashChainValid=true）', () => {
    const pkg = createPackage({ actorId: 'nobody' }, 'ADMIN');
    expect(pkg.eventCount).toBe(0);
    expect(pkg.hashChainValid).toBe(true);
  });
  test('CSV 含 header 行', () => {
    seed();
    const pkg = createPackage({ actorId: 'D1' }, 'ADMIN');
    const csv = packageToCsv(pkg);
    expect(csv.split('\n')[0]).toMatch(/^seq,occurredAt,actorId/);
    expect(csv.split('\n').length).toBe(3); // header + 2 events
  });
});
