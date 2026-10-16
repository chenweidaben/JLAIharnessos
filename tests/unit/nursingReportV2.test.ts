/**
 * 健澜科技 jlmedaios - 护理 V2 纯函数单测（M212-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessNursingStaffing,
  buildNursingReportV2,
  calculateNursingSatisfaction,
} from '../../src/bff/aggregators/nursingReportV2Aggregator';

describe('calculateNursingSatisfaction', () => {
  it('[98, 96, 97] → 97 优秀', () => {
    const r = calculateNursingSatisfaction([98, 96, 97]);
    expect(r.avg).toBe(97);
    expect(r.level).toBe('优秀');
  });

  it('[80, 82, 81] → 81 一般', () => {
    const r = calculateNursingSatisfaction([80, 82, 81]);
    expect(r.level).toBe('一般');
  });
});

describe('assessNursingStaffing', () => {
  it('1000 床 500 护士 → 0.5 充足', () => {
    const r = assessNursingStaffing(1000, 500);
    expect(r.nurseBedRatio).toBe(0.5);
    expect(r.adequate).toBe(true);
  });

  it('1000 床 300 护士 → 0.3 不足', () => {
    const r = assessNursingStaffing(1000, 300);
    expect(r.adequate).toBe(false);
  });
});

describe('buildNursingReportV2', () => {
  it('生成质量数据', () => {
    const r = buildNursingReportV2('30d');
    expect(r.quality.basic).toBeGreaterThan(0);
  });

  it('生成安全数据', () => {
    const r = buildNursingReportV2('30d');
    expect(r.safety.fall).toBeGreaterThanOrEqual(0);
  });

  it('生成人力数据', () => {
    const r = buildNursingReportV2('30d');
    expect(r.staffing.nurses).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildNursingReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
