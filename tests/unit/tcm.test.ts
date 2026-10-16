/**
 * 健澜科技 jlmedaios - 中医纯函数单测（M202-C）
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildTCMReport,
  classifyTCMConstitution,
  generateTCMPrescription,
  type Syndrome,
  type TCMConstitutionInput,
} from '../../src/bff/aggregators/tcmAggregator';

describe('classifyTCMConstitution', () => {
  it('阳虚质', () => {
    const input: TCMConstitutionInput = {
      coldPreference: true, heatPreference: false, dryness: false,
      dampness: false, qiDeficiency: false, yangDeficiency: true,
    };
    const r = classifyTCMConstitution(input);
    expect(r.type).toBe('阳虚质');
  });

  it('平和质', () => {
    const input: TCMConstitutionInput = {
      coldPreference: false, heatPreference: false, dryness: false,
      dampness: false, qiDeficiency: false, yangDeficiency: false,
    };
    const r = classifyTCMConstitution(input);
    expect(r.type).toBe('平和质');
  });
});

describe('generateTCMPrescription', () => {
  it('气虚处方', () => {
    const s: Syndrome = { name: '脾气虚证', symptoms: ['乏力', '食少'] };
    const r = generateTCMPrescription(s);
    expect(r.formula.length).toBeGreaterThan(0);
    expect(r.formula[0]).toContain('黄芪');
  });

  it('痰湿处方', () => {
    const s: Syndrome = { name: '痰湿内阻证', symptoms: ['苔腻', '脉滑'] };
    const r = generateTCMPrescription(s);
    expect(r.formula[0]).toContain('半夏');
  });
});

describe('buildTCMReport', () => {
  it('生成诊断数据', () => {
    const r = buildTCMReport('中医科', '30d');
    expect(r.diagnosis.consultations).toBeGreaterThan(0);
  });

  it('生成治疗数据', () => {
    const r = buildTCMReport('中医科', '30d');
    expect(r.treatment.acupuncture).toBeGreaterThan(0);
  });

  it('生成质量数据', () => {
    const r = buildTCMReport('中医科', '30d');
    expect(r.quality.herbStandardRate).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildTCMReport('中医科', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
