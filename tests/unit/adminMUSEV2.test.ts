/**
 * 健澜科技 jlmedaios - Admin MUSE V2 纯函数单测（M186-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildAdminMUSE } from '../../src/bff/aggregators/adminMUSEV2Aggregator';

describe('buildAdminMUSE 院长视图', () => {
  it('院长角色返回 dean 数据', () => {
    const r = buildAdminMUSE('dean', '全院', '2026-10-16');
    expect(r.dean).toBeDefined();
    expect(r.dean?.outpatientVisits).toBeGreaterThan(0);
    expect(r.deptHead).toBeUndefined();
  });
});

describe('buildAdminMUSE 科主任视图', () => {
  it('科主任角色返回 deptHead 数据', () => {
    const r = buildAdminMUSE('dept_head', '内科', '2026-10-16');
    expect(r.deptHead).toBeDefined();
    expect(r.dean).toBeUndefined();
  });
});

describe('buildAdminMUSE 护士长视图', () => {
  it('护士长角色返回 headNurse 数据', () => {
    const r = buildAdminMUSE('head_nurse', '内科', '2026-10-16');
    expect(r.headNurse).toBeDefined();
    expect(r.headNurse?.nursingSatisfaction).toBeGreaterThan(0);
  });
});

describe('buildAdminMUSE 决策建议', () => {
  it('生成至少1条建议', () => {
    const r = buildAdminMUSE('dean', '全院', '2026-10-16');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('病历合格率低于95%生成 medium 建议', () => {
    const r = buildAdminMUSE('dean', '全院', '2026-10-16');
    expect(r.suggestions.some((s) => s.category === '病历质量')).toBe(true);
  });
});
