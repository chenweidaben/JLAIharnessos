/**
 * 健澜科技 jlmedaios - 病理中心 V2 纯函数单测（M223-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessIHCQuality,
  buildPathologyReportV2,
  diagnosePathology,
} from '../../src/bff/aggregators/pathologyReportV2Aggregator';

describe('diagnosePathology', () => {
  it('100标本 → 30恶性 70良性', () => {
    const r = diagnosePathology(100, 200);
    expect(r.malignant).toBe(30);
    expect(r.benign).toBe(70);
  });
});

describe('assessIHCQuality', () => {
  it('100染色 95对照合格 → 95% 通过', () => {
    expect(assessIHCQuality(100, 95).pass).toBe(true);
  });

  it('100染色 80对照合格 → 80% 不通过', () => {
    expect(assessIHCQuality(100, 80).pass).toBe(false);
  });
});

describe('buildPathologyReportV2', () => {
  it('生成标本数据', () => {
    const r = buildPathologyReportV2('30d');
    expect(r.accessioning.specimens).toBeGreaterThan(0);
  });

  it('生成IHC数据', () => {
    const r = buildPathologyReportV2('30d');
    expect(r.ihc.stains).toBeGreaterThan(0);
  });

  it('生成冰冻数据', () => {
    const r = buildPathologyReportV2('30d');
    expect(r.frozen.intraop).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPathologyReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
