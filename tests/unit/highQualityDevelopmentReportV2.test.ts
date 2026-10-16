/**
 * 健澜科技 jlmedaios - 高质量发展 V2 纯函数单测（M230-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessHighQualityLevel,
  buildHighQualityDevelopmentReportV2,
  scoreNationalExam,
} from '../../src/bff/aggregators/highQualityDevelopmentReportV2Aggregator';

describe('scoreNationalExam', () => {
  it('[90,85,80,92] × [0.4,0.3,0.1,0.2] → 87.4 A级', () => {
    const r = scoreNationalExam([90, 85, 80, 92], [0.4, 0.3, 0.1, 0.2]);
    expect(r.grade).toBe('A');
  });

  it('[70,65,60,75] × [0.4,0.3,0.1,0.2] → 68.5 B级', () => {
    expect(scoreNationalExam([70, 65, 60, 75], [0.4, 0.3, 0.1, 0.2]).grade).toBe('B');
  });
});

describe('assessHighQualityLevel', () => {
  it('90分 → 卓越', () => {
    expect(assessHighQualityLevel(90).level).toBe('卓越');
  });

  it('75分 → 优秀', () => {
    expect(assessHighQualityLevel(75).level).toBe('优秀');
  });
});

describe('buildHighQualityDevelopmentReportV2', () => {
  it('生成国考数据', () => {
    const r = buildHighQualityDevelopmentReportV2('30d');
    expect(r.nationalExam.quality).toBeGreaterThan(0);
  });

  it('生成治理数据', () => {
    const r = buildHighQualityDevelopmentReportV2('30d');
    expect(r.governance.charter).toBe(true);
  });

  it('生成建议', () => {
    const r = buildHighQualityDevelopmentReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
