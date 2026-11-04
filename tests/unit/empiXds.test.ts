/**
 * 健澜AI原生医院操作系统OS - P5-3 EMPI + XDS 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore as empiReset, getMaster, link, listMasters, match, resolve, validateIdCard,
} from '../../src/bff/aggregators/empiFederatedAggregator';
import {
  __resetStore as xdsReset, DOCUMENT_TYPES, getContent, getMeta, listTypes, query, register, seed,
} from '../../src/bff/aggregators/xdsAggregator';

beforeEach(() => { empiReset(); xdsReset(); });

describe('EMPI 跨域链接', () => {
  test('同 master 跨 3 个 sourceSystem', () => {
    const a = link({ sourceSystem: 'HIS', sourcePatientId: 'P-001', name: '张三', birthDate: '1990-01-01', gender: 'M', idCard: '11010119900101123X', phone: '13800000001' });
    expect(a.ok).toBe(true);
    const masterId = (a as any).link.masterPatientId;
    const b = link({ masterPatientId: masterId, sourceSystem: 'LIS', sourcePatientId: 'L-001' });
    const c = link({ masterPatientId: masterId, sourceSystem: 'PACS', sourcePatientId: 'PAC-001' });
    expect(b.ok).toBe(true); expect(c.ok).toBe(true);
    const m = getMaster(masterId)!;
    expect(m.links.length).toBe(3);
  });
  test('重复 sourceSystem+sourcePatientId → duplicate-link', () => {
    link({ sourceSystem: 'HIS', sourcePatientId: 'P-001' });
    const r = link({ sourceSystem: 'HIS', sourcePatientId: 'P-001' });
    expect(r.ok).toBe(false);
    expect((r as any).error).toBe('duplicate-link');
  });
  test('resolve 反查 master', () => {
    const a = link({ sourceSystem: 'HIS', sourcePatientId: 'P-001' });
    const masterId = (a as any).link.masterPatientId;
    expect(resolve('HIS', 'P-001')).toBe(masterId);
    expect(resolve('HIS', 'nope')).toBeNull();
  });
  test('match by idCard → exact', () => {
    link({ sourceSystem: 'HIS', sourcePatientId: 'P-001', idCard: '11010119900101123X' });
    const r = match({ idCard: '11010119900101123X' });
    expect(r.matched).toBe(true);
    expect(r.confidence).toBe('exact');
  });
  test('match by name+birthDate+gender → probable', () => {
    link({ sourceSystem: 'HIS', sourcePatientId: 'P-001', name: '李四', birthDate: '1985-05-05', gender: 'F' });
    const r = match({ name: '李四', birthDate: '1985-05-05', gender: 'F' });
    expect(r.matched).toBe(true);
    expect(r.confidence).toBe('probable');
  });
  test('match by phone → probable', () => {
    link({ sourceSystem: 'HIS', sourcePatientId: 'P-001', phone: '13900000001' });
    const r = match({ phone: '13900000001' });
    expect(r.matched).toBe(true);
    expect(r.confidence).toBe('probable');
  });
  test('match 不存在 → none', () => {
    link({ sourceSystem: 'HIS', sourcePatientId: 'P-001', name: '王五' });
    const r = match({ name: '不存在' });
    expect(r.matched).toBe(false);
    expect(r.confidence).toBe('none');
  });
  test('validateIdCard 18 位 + X 末位', () => {
    expect(validateIdCard('11010119900101123X')).toBe(true);
    expect(validateIdCard('11010119900101123x')).toBe(true);
    expect(validateIdCard('123')).toBe(false);
  });
  test('listMasters 分页', () => {
    link({ sourceSystem: 'HIS', sourcePatientId: 'A' });
    link({ sourceSystem: 'HIS', sourcePatientId: 'B' });
    const r = listMasters(10, 0);
    expect(r.total).toBe(2);
  });
});

describe('XDS 文档', () => {
  test('注册 → documentId + contentHash 64 hex', () => {
    const r = register({ patientId: 'P1', documentType: '34133-9', title: '摘要', authorId: 'doc', authorOrg: '院', content: 'hello' });
    expect(r.ok).toBe(true);
    const d = (r as any).doc;
    expect(d.documentId).toMatch(/^XDS-/);
    expect(d.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });
  test('documentType 不在码表 → invalid-type', () => {
    const r = register({ patientId: 'P1', documentType: 'BAD', title: 't', authorId: 'a', authorOrg: 'o', content: 'c' });
    expect(r.ok).toBe(false);
    expect((r as any).error).toBe('invalid-type');
  });
  test('content 空 → empty-content', () => {
    const r = register({ patientId: 'P1', documentType: '34133-9', title: 't', authorId: 'a', authorOrg: 'o', content: '' });
    expect(r.ok).toBe(false);
    expect((r as any).error).toBe('empty-content');
  });
  test('同 patientId+documentType+contentHash 重复 → duplicate', () => {
    register({ patientId: 'P1', documentType: '34133-9', title: 't', authorId: 'a', authorOrg: 'o', content: 'same' });
    const r = register({ patientId: 'P1', documentType: '34133-9', title: 't2', authorId: 'a', authorOrg: 'o', content: 'same' });
    expect(r.ok).toBe(false);
    expect((r as any).error).toBe('duplicate');
  });
  test('query 按 patientId 过滤', () => {
    register({ patientId: 'P-A', documentType: '34133-9', title: 't', authorId: 'a', authorOrg: 'o', content: 'c1' });
    register({ patientId: 'P-B', documentType: '34133-9', title: 't', authorId: 'a', authorOrg: 'o', content: 'c2' });
    const r = query({ patientId: 'P-A' });
    expect(r.total).toBe(1);
  });
  test('query 不返 content 字段', () => {
    register({ patientId: 'P1', documentType: '34133-9', title: 't', authorId: 'a', authorOrg: 'o', content: 'secret' });
    const r = query({});
    expect((r.rows[0] as any).content).toBeUndefined();
  });
  test('getContent → hashValid=true', () => {
    const r = register({ patientId: 'P1', documentType: '34133-9', title: 't', authorId: 'a', authorOrg: 'o', content: 'verify-me' });
    const docId = (r as any).doc.documentId;
    const c = getContent(docId)!;
    expect(c.hashValid).toBe(true);
    expect(c.content).toBe('verify-me');
  });
  test('getMeta 不存在 → null', () => {
    expect(getMeta('nope')).toBeNull();
  });
  test('listTypes ≥ 8 个', () => {
    expect(listTypes().length).toBeGreaterThanOrEqual(8);
  });
  test('seed 灌样本', () => {
    const n = seed();
    expect(n).toBeGreaterThanOrEqual(1);
  });
  test('DOCUMENT_TYPES 含关键 LOINC 码', () => {
    const codes = DOCUMENT_TYPES.map((t) => t.code);
    expect(codes).toContain('34133-9');
    expect(codes).toContain('11506-3');
    expect(codes).toContain('18748-4');
  });
});
