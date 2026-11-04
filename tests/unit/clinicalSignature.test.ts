/**
 * 健澜AI原生医院操作系统OS - P0-6 临床电子签名（SM2/SM3+TSA）单测
 *
 * 覆盖：sm3('abc') 测试向量、doctor/nurse 签名闭环、权限 403、非法入参 400、
 * 幂等同签同号、验签 valid=true、篡改 valid=false、signId 不存在 404、prevHash 链。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import * as smCrypto from 'sm-crypto';
import {
  __resetStore,
  signClinicalObject,
  verifyClinicalObject,
  listObjectSignatures,
  ClinicalSignatureError,
} from '../../src/bff/aggregators/clinicalSignatureAggregator';

const sm3 = smCrypto.sm3;
const DOC = '患者张某某，男，65岁，诊断：肺炎。予抗感染治疗。';

beforeEach(() => __resetStore());

describe('P0-6 SM3 正确性', () => {
  test("sm3('abc') 命中国密标准测试向量", () => {
    expect(sm3('abc')).toBe('66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0');
  });
});

describe('P0-6 签名权限', () => {
  test('doctor 签 emr → 成功（含 sm3Digest/signature/tsa）', () => {
    const r = signClinicalObject({ objectType: 'emr', objectId: 'EMR-1', content: DOC, roles: ['doctor'], signedBy: 'doc01' });
    expect(r.signId).toMatch(/^CSIP?/);
    expect(r.sm3Digest).toBe(sm3(DOC));
    expect(r.signature.length).toBeGreaterThan(20);
    expect(r.publicKey.length).toBe(130);
    expect(r.tsaCertId).toBe('MOCK-TSA-SM2-CERT-0001');
  });

  test('doctor 签 order → 成功', () => {
    const r = signClinicalObject({ objectType: 'order', objectId: 'ORD-1', content: '阿莫西林 0.5g tid', roles: ['doctor'], signedBy: 'doc01' });
    expect(r.objectType).toBe('order');
  });

  test('nurse 签 nursing-record → 成功', () => {
    const r = signClinicalObject({ objectType: 'nursing-record', objectId: 'NR-1', content: 'Shift handover: patient stable', roles: ['nurse'], signedBy: 'nur01' });
    expect(r.objectType).toBe('nursing-record');
  });

  test('doctor 签 nursing-record → 403', () => {
    let s = 0;
    try { signClinicalObject({ objectType: 'nursing-record', objectId: 'NR-2', content: 'x', roles: ['doctor'], signedBy: 'doc01' }); }
    catch (e) { s = (e as ClinicalSignatureError).status; }
    expect(s).toBe(403);
  });

  test('nurse 签 emr → 403', () => {
    let s = 0;
    try { signClinicalObject({ objectType: 'emr', objectId: 'EMR-2', content: 'x', roles: ['nurse'], signedBy: 'nur01' }); }
    catch (e) { s = (e as ClinicalSignatureError).status; }
    expect(s).toBe(403);
  });
});

describe('P0-6 入参校验', () => {
  test('非法 objectType → 400', () => {
    let s = 0;
    try { signClinicalObject({ objectType: 'lab', objectId: 'X', content: 'x', roles: ['doctor'], signedBy: 'd' }); }
    catch (e) { s = (e as ClinicalSignatureError).status; }
    expect(s).toBe(400);
  });
  test('content 空 → 400', () => {
    let s = 0;
    try { signClinicalObject({ objectType: 'emr', objectId: 'E', content: '', roles: ['doctor'], signedBy: 'd' }); }
    catch (e) { s = (e as ClinicalSignatureError).status; }
    expect(s).toBe(400);
  });
});

describe('P0-6 幂等与验签', () => {
  test('同一 objectId 重复签名 → 返回原签名（同 signId 幂等）', () => {
    const r1 = signClinicalObject({ objectType: 'emr', objectId: 'EMR-9', content: DOC, roles: ['doctor'], signedBy: 'doc01' });
    const r2 = signClinicalObject({ objectType: 'emr', objectId: 'EMR-9', content: DOC, roles: ['doctor'], signedBy: 'doc02' });
    expect(r1.signId).toBe(r2.signId);
  });

  test('验签原文 → valid=true', () => {
    const r = signClinicalObject({ objectType: 'emr', objectId: 'EMR-3', content: DOC, roles: ['doctor'], signedBy: 'doc01' });
    const v = verifyClinicalObject({ signId: r.signId, content: DOC });
    expect(v.valid).toBe(true);
  });

  test('验签篡改内容 → valid=false', () => {
    const r = signClinicalObject({ objectType: 'emr', objectId: 'EMR-4', content: DOC, roles: ['doctor'], signedBy: 'doc01' });
    const v = verifyClinicalObject({ signId: r.signId, content: DOC + '被篡改加药' });
    expect(v.valid).toBe(false);
  });

  test('signId 不存在 → 404', () => {
    let s = 0;
    try { verifyClinicalObject({ signId: 'CSIG-9999' }); }
    catch (e) { s = (e as ClinicalSignatureError).status; }
    expect(s).toBe(404);
  });

  test('prevHash 链：第二条签名 prevHash = 第一条摘要', () => {
    const a = signClinicalObject({ objectType: 'emr', objectId: 'EMR-A', content: 'A', roles: ['doctor'], signedBy: 'd' });
    const b = signClinicalObject({ objectType: 'order', objectId: 'ORD-B', content: 'B', roles: ['doctor'], signedBy: 'd' });
    expect(b.prevHash).toBe(a.sm3Digest);
    expect(a.prevHash).not.toBe('');
  });

  test('listObjectSignatures 按对象返回', () => {
    signClinicalObject({ objectType: 'emr', objectId: 'EMR-L', content: 'x', roles: ['doctor'], signedBy: 'd' });
    signClinicalObject({ objectType: 'emr', objectId: 'EMR-L', content: 'x', roles: ['doctor'], signedBy: 'd' });
    const list = listObjectSignatures('emr', 'EMR-L');
    expect(list.length).toBe(1); // 幂等不重复
  });
});
