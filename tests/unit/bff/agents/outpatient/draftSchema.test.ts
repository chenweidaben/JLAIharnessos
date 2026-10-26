/**
 * S-09 门诊草稿 Schema 校验与装配单测（4.2.5 输出 Schema）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import {
  validateOutpatientDraft,
  buildOutpatientDraft,
  buildNoEvidenceSections,
  appendPendingMarker,
  deriveDraftEvidenceLevel,
} from '@/bff/agents/outpatient/draftSchema.js';
import { demoCitations } from './fixtures.js';

const validRaw = {
  encounterKind: 'initial' as const,
  chiefComplaint: '头痛3天',
  presentIllness: '3天前出现头痛，伴轻度恶心。',
  historyIllness: '既往体健，否认慢性病。',
  physicalExam: '神清，心肺未见异常。',
  auxiliaryExams: '头颅 CT 未见异常。',
  diagnosis: [{ code: 'R51', name: '头痛', certainty: 'possible' as const }],
  suggestions: [
    { kind: 'exam' as const, content: '建议复查头颅 CT', citations: ['[1]'], basisNote: '排除器质性病变' },
  ],
  missingInfo: [] as string[],
  citations: demoCitations,
  evidenceLevel: 'supported' as const,
};

describe('门诊草稿 Schema 校验 validateOutpatientDraft', () => {
  it('合法草稿校验通过并回传结构化草稿', () => {
    const result = validateOutpatientDraft(validRaw);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.draft?.diagnosis[0].code).toBe('R51');
  });

  it('exam 建议缺少引用编号时拦截', () => {
    const raw = {
      ...validRaw,
      suggestions: [{ kind: 'exam' as const, content: '建议复查头颅 CT', citations: [], basisNote: '排除器质性病变' }],
    };
    const result = validateOutpatientDraft(raw);
    expect(result.valid).toBe(false);
    expect(result.errors.join('；')).toContain('引用编号');
  });

  it('诊断确定性枚举非法时拦截', () => {
    const raw = {
      ...validRaw,
      diagnosis: [{ code: 'R51', name: '头痛', certainty: 'certain' }],
    };
    const result = validateOutpatientDraft(raw);
    expect(result.valid).toBe(false);
    expect(result.errors.join('；')).toContain('certainty');
  });

  it('evidenceLevel 与引用 / 缺项不一致时拦截', () => {
    const raw = { ...validRaw, evidenceLevel: 'none' as const };
    const result = validateOutpatientDraft(raw);
    expect(result.valid).toBe(false);
    expect(result.errors.join('；')).toContain('evidenceLevel');
  });

  it('就诊类型枚举非法时拦截', () => {
    const result = validateOutpatientDraft({ ...validRaw, encounterKind: 'emergency' });
    expect(result.valid).toBe(false);
    expect(result.errors.join('；')).toContain('encounterKind');
  });
});

describe('草稿装配 buildOutpatientDraft', () => {
  it('有引用且无缺项时证据级别推导为 supported', () => {
    const draft = buildOutpatientDraft({ encounterKind: 'initial', citations: demoCitations });
    expect(draft.evidenceLevel).toBe('supported');
  });

  it('无引用时证据级别推导为 none', () => {
    const draft = buildOutpatientDraft({ encounterKind: 'initial' });
    expect(draft.evidenceLevel).toBe('none');
  });

  it('deriveDraftEvidenceLevel 与 S-12 口径一致', () => {
    expect(deriveDraftEvidenceLevel(demoCitations, [])).toBe('supported');
    expect(deriveDraftEvidenceLevel([], [])).toBe('none');
    expect(deriveDraftEvidenceLevel(demoCitations, ['既往史待补充'])).toBe('partial');
  });
});

describe('无依据段与待核实标记', () => {
  it('buildNoEvidenceSections 产出待核实模板与兜底缺项文案', () => {
    const result = buildNoEvidenceSections('头痛是否需要做 CT？', []);
    expect(result.content).toContain('（待核实）');
    expect(result.missingInfo).toContain('检索未命中可引用知识条目');
  });

  it('appendPendingMarker 为已有文本追加待核实前缀且不重复叠加', () => {
    expect(appendPendingMarker('头痛待查')).toBe('（待核实）头痛待查');
    expect(appendPendingMarker('（待核实）头痛待查')).toBe('（待核实）头痛待查');
    expect(appendPendingMarker('')).toBe('（待核实）');
  });
});
