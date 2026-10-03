/* ============================================================================
 * 健澜科技杠OS - EMPI 匹配引擎单元测试（M5-C）
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { describe, expect, it } from 'bun:test';
import {
  CANDIDATE_THRESHOLD,
  type EmpiIdentifier,
  type EmpiPatient,
  scanCandidates,
  scorePair,
} from '../../../src/medical-tools/empi/empiMatcher.js';

function patient(over: Partial<EmpiPatient> = {}): EmpiPatient {
  return {
    id: over.id ?? 'p1',
    mrn: over.mrn ?? 'M001',
    nameMasked: over.nameMasked ?? '张*',
    gender: over.gender ?? '男',
    birthDate: over.birthDate ?? '1980-01-01',
    idCardHash: over.idCardHash ?? null,
  };
}

function ident(
  patientId: string,
  domain: EmpiIdentifier['domain'],
  hash: string,
): EmpiIdentifier {
  return { patientId, domain, identifierHash: hash };
}

describe('scorePair 评分档', () => {
  it('身份证哈希一致给 100 分', () => {
    const a = patient({ id: 'a', idCardHash: 'H1' });
    const b = patient({ id: 'b', idCardHash: 'H1' });
    const m = scorePair(a, b);
    expect(m.score).toBe(100);
    expect(m.reasons).toContain('身份证标识一致');
  });

  it('手机标识一致给 95 分', () => {
    const a = patient({ id: 'a', nameMasked: '李*', birthDate: '1990-02-02' });
    const b = patient({ id: 'b', nameMasked: '王*', birthDate: '1970-03-03' });
    const m = scorePair(a, b, [ident('a', 'phone', 'P')], [ident('b', 'phone', 'P')]);
    expect(m.score).toBe(95);
    expect(m.reasons).toContain('手机标识一致');
  });

  it('医保标识一致给 95 分', () => {
    const a = patient({ id: 'a', nameMasked: '李*', birthDate: '1990-02-02' });
    const b = patient({ id: 'b', nameMasked: '王*', birthDate: '1970-03-03' });
    const m = scorePair(
      a, b,
      [ident('a', 'insurance', 'I')],
      [ident('b', 'insurance', 'I')],
    );
    expect(m.score).toBe(95);
    expect(m.reasons).toContain('医保标识一致');
  });

  it('微信标识一致给 90 分', () => {
    const a = patient({ id: 'a', nameMasked: '李*', birthDate: '1990-02-02' });
    const b = patient({ id: 'b', nameMasked: '王*', birthDate: '1970-03-03' });
    const m = scorePair(
      a, b,
      [ident('a', 'wechat', 'W')],
      [ident('b', 'wechat', 'W')],
    );
    expect(m.score).toBe(90);
    expect(m.reasons).toContain('微信标识一致');
  });

  it('姓名+性别+出生日期一致给 80 分', () => {
    const a = patient({ id: 'a' });
    const b = patient({ id: 'b' });
    const m = scorePair(a, b);
    expect(m.score).toBe(80);
    expect(m.reasons).toContain('姓名、性别、出生日期一致');
  });

  it('性别+出生日期一致但姓名不同给 55 分（低于阈值）', () => {
    const a = patient({ id: 'a', nameMasked: '李*' });
    const b = patient({ id: 'b', nameMasked: '王*' });
    const m = scorePair(a, b);
    expect(m.score).toBe(55);
    expect(m.score < CANDIDATE_THRESHOLD).toBe(true);
  });

  it('姓名+性别+出生年一致给 45 分（出生日期不同）', () => {
    const a = patient({ id: 'a', birthDate: '1980-05-05' });
    const b = patient({ id: 'b', birthDate: '1980-11-11' });
    const m = scorePair(a, b);
    expect(m.score).toBe(45);
  });

  it('无任何共性给 0 分', () => {
    const a = patient({ id: 'a', nameMasked: '李*', gender: '男', birthDate: '1990-01-01' });
    const b = patient({ id: 'b', nameMasked: '王*', gender: '女', birthDate: '1970-01-01' });
    const m = scorePair(a, b);
    expect(m.score).toBe(0);
    expect(m.reasons).toHaveLength(0);
  });

  it('身份证与手机同时命中时取最高分（100），不叠加', () => {
    const a = patient({ id: 'a', idCardHash: 'H' });
    const b = patient({ id: 'b', idCardHash: 'H' });
    const m = scorePair(
      a, b,
      [ident('a', 'phone', 'P')],
      [ident('b', 'phone', 'P')],
    );
    expect(m.score).toBe(100);
    expect(m.reasons).toHaveLength(1);
  });
});

describe('scanCandidates 扫描', () => {
  it('仅保留达到阈值的候选，并按评分降序', () => {
    const strong = patient({ id: 's1', idCardHash: 'X' });
    const strong2 = patient({ id: 's2', idCardHash: 'X' });
    const weak = patient({ id: 'w1', nameMasked: '钱*', gender: '女', birthDate: '2000-01-01' });
    const results = scanCandidates([strong, strong2, weak]);
    // s1-s2 强匹配（100）；其余配对无证据
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(100);
  });

  it('患者对按输入顺序取 i<j，不重复', () => {
    const a = patient({ id: 'a', idCardHash: 'Z' });
    const b = patient({ id: 'b', idCardHash: 'Z' });
    const results = scanCandidates([a, b]);
    expect(results).toHaveLength(1);
    expect(results[0].patientAId).toBe('a');
    expect(results[0].patientBId).toBe('b');
  });

  it('空患者列表返回空', () => {
    expect(scanCandidates([])).toHaveLength(0);
  });
});
