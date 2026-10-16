/**
 * 健澜科技 jlmedaios - 麻醉中心 V2 纯函数单测（M224-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessAnesthesiaRisk,
  buildAnesthesiaReportV2,
  designAnesthesiaPlan,
} from '../../src/bff/aggregators/anesthesiaReportV2Aggregator';

describe('assessAnesthesiaRisk', () => {
  it('ASA4 合并症2 → 6分 高危', () => {
    expect(assessAnesthesiaRisk(4, 2).high).toBe(true);
  });

  it('ASA2 合并症1 → 3分 低危', () => {
    expect(assessAnesthesiaRisk(2, 1).level).toBe('低危');
  });
});

describe('designAnesthesiaPlan', () => {
  it('下肢手术 → 椎管内', () => {
    expect(designAnesthesiaPlan('下肢手术', 1).method).toBe('椎管内');
  });

  it('浅表手术 → 神经阻滞', () => {
    expect(designAnesthesiaPlan('浅表肿物', 1).method).toBe('神经阻滞');
  });
});

describe('buildAnesthesiaReportV2', () => {
  it('生成ASA数据', () => {
    const r = buildAnesthesiaReportV2('30d');
    expect(r.preop.asa).toBeGreaterThan(0);
  });

  it('生成麻醉方式数据', () => {
    const r = buildAnesthesiaReportV2('30d');
    expect(r.method.ga).toBeGreaterThan(0);
  });

  it('生成镇痛数据', () => {
    const r = buildAnesthesiaReportV2('30d');
    expect(r.analgesia.pca).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildAnesthesiaReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
