/**
 * 健澜科技 jlmedaios - 工会群团 V2 纯函数单测（M228-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessUnionSatisfaction,
  buildUnionReportV2,
  organizeUnionActivity,
} from '../../src/bff/aggregators/unionReportV2Aggregator';

describe('assessUnionSatisfaction', () => {
  it('90分 → 高', () => {
    expect(assessUnionSatisfaction(90).level).toBe('高');
  });

  it('75分 → 良好', () => {
    expect(assessUnionSatisfaction(75).level).toBe('良好');
  });
});

describe('organizeUnionActivity', () => {
  it('体育活动 → 300人', () => {
    expect(organizeUnionActivity('体育比赛').participants).toBe(300);
  });

  it('文艺活动 → 200人', () => {
    expect(organizeUnionActivity('文艺汇演').participants).toBe(200);
  });
});

describe('buildUnionReportV2', () => {
  it('生成组织数据', () => {
    const r = buildUnionReportV2('30d');
    expect(r.organization.branches).toBeGreaterThan(0);
  });

  it('生成福利数据', () => {
    const r = buildUnionReportV2('30d');
    expect(r.welfare.subsidy).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildUnionReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
