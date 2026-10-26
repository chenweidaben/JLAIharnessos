/**
 * S-09 门诊实时质控五条规则单测（4.2.3 qc-realtime）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import { runQcRealtime, type QcContext } from '@/bff/agents/outpatient/qcRealtime.js';
import type { OutpatientRecordDraft } from '@/bff/agents/outpatient/types.js';
import type { FactSnapshot } from '@/security/ai/types.js';

const baseFacts: FactSnapshot = { diagnoses: [], medications: [], keyVitals: {} };

function context(overrides: Partial<QcContext> = {}): QcContext {
  return { encounterKind: 'initial', facts: baseFacts, timeline: [], ...overrides };
}

function draft(overrides: Partial<OutpatientRecordDraft> = {}): OutpatientRecordDraft {
  return {
    encounterKind: 'initial',
    chiefComplaint: '头痛3天',
    presentIllness: '患者3天前出现头痛，伴轻度恶心。',
    historyIllness: '既往体健，否认慢性病。',
    physicalExam: '神清，心肺未见异常。',
    auxiliaryExams: '头颅 CT 未见异常。',
    diagnosis: [{ code: 'R51', name: '头痛', certainty: 'possible' }],
    suggestions: [],
    missingInfo: [],
    citations: [],
    evidenceLevel: 'none',
    ...overrides,
  };
}

describe('门诊实时质控 runQcRealtime', () => {
  it('主诉-现病史对应：现病史覆盖主诉症状时不产生该规则发现', () => {
    const findings = runQcRealtime(draft(), context());
    expect(findings.some((f) => f.rule === 'chief-complaint-correspondence')).toBe(false);
  });

  it('主诉-现病史对应：修饰词未复现但核心症状已覆盖时不误报', () => {
    const findings = runQcRealtime(
      draft({ chiefComplaint: '反复咳嗽咳痰3天', presentIllness: '患者3天前出现咳嗽咳痰，伴少量白痰。' }),
      context(),
    );
    expect(findings.some((f) => f.rule === 'chief-complaint-correspondence')).toBe(false);
  });

  it('主诉-现病史对应：主诉与现病史症状不一致时出 caution', () => {
    const findings = runQcRealtime(
      draft({ chiefComplaint: '胸痛2天', presentIllness: '头痛3天，伴恶心。' }),
      context(),
    );
    const finding = findings.find((f) => f.rule === 'chief-complaint-correspondence');
    expect(finding?.severity).toBe('caution');
  });

  it('时间线一致性：否认事实快照已记录诊断时出 block', () => {
    const facts: FactSnapshot = { ...baseFacts, diagnoses: ['高血压'] };
    const findings = runQcRealtime(
      draft({ presentIllness: '否认既往高血压病史，本次因头痛就诊。' }),
      context({ facts }),
    );
    const finding = findings.find((f) => f.rule === 'timeline-consistency' && f.severity === 'block');
    expect(finding).toBeTruthy();
  });

  it('时间线一致性：日期表述超出合理范围时出 caution', () => {
    const findings = runQcRealtime(
      draft({ auxiliaryExams: '2099-01-01 头颅 CT 未见异常。' }),
      context(),
    );
    expect(findings.some((f) => f.rule === 'timeline-consistency')).toBe(true);
  });

  it('ICD-诊断-用药匹配：诊断高血压却建议降糖药方向时出 caution', () => {
    const findings = runQcRealtime(
      draft({
        diagnosis: [{ code: 'I10', name: '高血压', certainty: 'likely' }],
        suggestions: [
          { kind: 'medication', content: '建议口服二甲双胍 0.5g 每日两次', citations: ['[1]'], basisNote: '用药方向待核' },
        ],
      }),
      context(),
    );
    const finding = findings.find((f) => f.rule === 'icd-diagnosis-medication-match');
    expect(finding?.severity).toBe('caution');
  });

  it('ICD-诊断-用药匹配：诊断与兼容用药方向一致时不出该规则发现', () => {
    const findings = runQcRealtime(
      draft({
        diagnosis: [{ code: 'I10', name: '高血压', certainty: 'likely' }],
        suggestions: [
          { kind: 'medication', content: '建议氨氯地平 5mg 每日一次', citations: ['[1]'], basisNote: '降压方向' },
        ],
      }),
      context(),
    );
    expect(findings.some((f) => f.rule === 'icd-diagnosis-medication-match')).toBe(false);
  });

  it('复制粘贴检测：跨章节 80 字以上重复片段出 caution', () => {
    const repeated = '患者本次就诊主要描述头痛反复发作伴有恶心呕吐食欲下降睡眠欠佳精神一般。'.repeat(3);
    const findings = runQcRealtime(
      draft({ historyIllness: repeated, physicalExam: repeated }),
      context(),
    );
    const finding = findings.find((f) => f.rule === 'copy-paste-detection');
    expect(finding?.severity).toBe('caution');
    expect(finding?.excerpt?.length).toBeGreaterThanOrEqual(80);
  });

  it('要素完整性：初诊必备章节缺失时按章节出 caution', () => {
    const findings = runQcRealtime(
      draft({ historyIllness: '', physicalExam: '', auxiliaryExams: '' }),
      context(),
    );
    const completeness = findings.filter((f) => f.rule === 'element-completeness');
    expect(completeness.length).toBeGreaterThanOrEqual(3);
    expect(completeness.every((f) => f.severity === 'caution')).toBe(true);
  });
});
