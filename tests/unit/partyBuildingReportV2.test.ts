/**
 * 健澜科技 jlmedaios - 党建 V2 纯函数单测（M228-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessPartyBuildingScore,
  buildPartyBuildingReportV2,
  trackOrganizationalLife,
} from '../../src/bff/aggregators/partyBuildingReportV2Aggregator';

describe('assessPartyBuildingScore', () => {
  it('90分 → 优秀', () => {
    expect(assessPartyBuildingScore(90).level).toBe('优秀');
  });

  it('75分 → 良好', () => {
    expect(assessPartyBuildingScore(75).level).toBe('良好');
  });
});

describe('trackOrganizationalLife', () => {
  it('100次会议 → 83.3%完成率', () => {
    expect(trackOrganizationalLife(100).rate).toBe(83.3);
  });
});

describe('buildPartyBuildingReportV2', () => {
  it('生成组织数据', () => {
    const r = buildPartyBuildingReportV2('30d');
    expect(r.organization.branches).toBeGreaterThan(0);
  });

  it('生成党员数据', () => {
    const r = buildPartyBuildingReportV2('30d');
    expect(r.members.total).toBeGreaterThan(0);
  });

  it('生成廉政数据', () => {
    const r = buildPartyBuildingReportV2('30d');
    expect(r.integrity.cleanPractice).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPartyBuildingReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
