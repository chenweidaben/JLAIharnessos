/**
 * 健澜科技 jlmedaios - 护理 V3 纯函数单测（M205-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessNursingQuality,
  buildNursingReportV3,
  classifyPressureUlcer,
  type NursingQualityIndicators,
} from '../../src/bff/aggregators/nursingReportV3Aggregator';

describe('assessNursingQuality', () => {
  it('全部达标 → 优秀', () => {
    const ind: NursingQualityIndicators = { fallRate: 0.003, pressureUlcerRate: 0.005, tubeDisplacementRate: 0.005, medicationErrorRate: 0.0005 };
    const r = assessNursingQuality(ind);
    expect(r.level).toBe('优秀');
    expect(r.pass).toBe(true);
  });

  it('多项超标 → 不合格', () => {
    const ind: NursingQualityIndicators = { fallRate: 0.02, pressureUlcerRate: 0.02, tubeDisplacementRate: 0.02, medicationErrorRate: 0.005 };
    const r = assessNursingQuality(ind);
    expect(r.pass).toBe(false);
  });
});

describe('classifyPressureUlcer', () => {
  it('I 期', () => {
    const r = classifyPressureUlcer(1);
    expect(r.stage).toContain('I 期');
  });

  it('IV 期', () => {
    const r = classifyPressureUlcer(4);
    expect(r.stage).toContain('IV 期');
  });
});

describe('buildNursingReportV3', () => {
  it('生成分级数据', () => {
    const r = buildNursingReportV3('30d');
    expect(r.grading.special).toBeGreaterThan(0);
  });

  it('生成安全数据', () => {
    const r = buildNursingReportV3('30d');
    expect(r.safety.fall).toBeGreaterThanOrEqual(0);
  });

  it('生成人力数据', () => {
    const r = buildNursingReportV3('30d');
    expect(r.staffing.bedNurseRatio).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildNursingReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
