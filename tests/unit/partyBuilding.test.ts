/**
 * 健澜科技 jlmedaios - 党建管理纯函数单测（M194-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPartyBuildingReport,
  generatePartyBuildingSuggestion,
  scorePartyBuilding,
  type PartyBuildingData,
} from '../../src/bff/aggregators/partyBuildingAggregator';

describe('scorePartyBuilding', () => {
  it('得分不超过 100', () => {
    const data: PartyBuildingData = { partyOrgCount: 100, partyMemberRate: 1, threeMeetingsPerQuarter: 100, themePartyDayPerMonth: 10, educationHours: 500, activitiesCount: 100, integrityTrainingCount: 100 };
    expect(scorePartyBuilding(data)).toBeLessThanOrEqual(100);
  });

  it('体系越完善得分越高', () => {
    const low: PartyBuildingData = { partyOrgCount: 1, partyMemberRate: 0.1, threeMeetingsPerQuarter: 1, themePartyDayPerMonth: 0, educationHours: 2, activitiesCount: 1, integrityTrainingCount: 0 };
    const high: PartyBuildingData = { partyOrgCount: 25, partyMemberRate: 0.4, threeMeetingsPerQuarter: 4, themePartyDayPerMonth: 1, educationHours: 30, activitiesCount: 6, integrityTrainingCount: 4 };
    expect(scorePartyBuilding(high)).toBeGreaterThan(scorePartyBuilding(low));
  });
});

describe('generatePartyBuildingSuggestion', () => {
  it('低分 → 生成多项改进', () => {
    const s = generatePartyBuildingSuggestion({ score: 60, gaps: [] });
    expect(s.length).toBeGreaterThan(1);
  });

  it('高分 → 打造品牌', () => {
    const s = generatePartyBuildingSuggestion({ score: 90, gaps: [] });
    expect(s.some((x) => x.includes('品牌'))).toBe(true);
  });
});

describe('buildPartyBuildingReport', () => {
  it('生成组织数据', () => {
    const r = buildPartyBuildingReport('党委办公室', '30d');
    expect(r.organization.branch).toBeGreaterThan(0);
  });

  it('生成组织生活', () => {
    const r = buildPartyBuildingReport('党委办公室', '30d');
    expect(r.life.threeMeetings).toBeGreaterThan(0);
  });

  it('生成教育数据', () => {
    const r = buildPartyBuildingReport('党委办公室', '30d');
    expect(r.education.hours).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPartyBuildingReport('党委办公室', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
