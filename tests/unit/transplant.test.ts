/**
 * 健澜科技 jlmedaios - 移植透析纯函数单测（M203-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessTransplantCompatibility,
  buildTransplantReport,
  calculateDialysisAdequacy,
  type Donor,
  type Recipient,
} from '../../src/bff/aggregators/transplantAggregator';

describe('assessTransplantCompatibility', () => {
  it('同血型+HLA 全匹配 → 优良', () => {
    const donor: Donor = { bloodType: 'O', hlaMatch: 6 };
    const recipient: Recipient = { bloodType: 'O', hlaMatch: 6 };
    const r = assessTransplantCompatibility(donor, recipient);
    expect(r.compatible).toBe(true);
    expect(r.level).toBe('优良');
  });

  it('血型不兼容 → 不相容', () => {
    const donor: Donor = { bloodType: 'B', hlaMatch: 0 };
    const recipient: Recipient = { bloodType: 'A', hlaMatch: 0 };
    const r = assessTransplantCompatibility(donor, recipient);
    expect(r.compatible).toBe(false);
  });
});

describe('calculateDialysisAdequacy', () => {
  it('Kt/V 1.4 + URR 70 → 充分', () => {
    const r = calculateDialysisAdequacy(1.4, 70);
    expect(r.adequate).toBe(true);
    expect(r.level).toBe('充分');
  });

  it('Kt/V 1.0 + URR 55 → 不充分', () => {
    const r = calculateDialysisAdequacy(1.0, 55);
    expect(r.adequate).toBe(false);
    expect(r.level).toBe('不充分');
  });
});

describe('buildTransplantReport', () => {
  it('生成等待数据', () => {
    const r = buildTransplantReport('30d');
    expect(r.waiting.list).toBeGreaterThan(0);
  });

  it('生成透析数据', () => {
    const r = buildTransplantReport('30d');
    expect(r.dialysis.patients).toBeGreaterThan(0);
  });

  it('生成移植数据', () => {
    const r = buildTransplantReport('30d');
    expect(r.kidney.transplants).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildTransplantReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
