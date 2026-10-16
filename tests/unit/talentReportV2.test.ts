/**
 * 健澜科技 jlmedaios - 人才队伍 V2 纯函数单测（M219-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessTalentStructure,
  buildTalentPipeline,
  buildTalentReportV2,
} from '../../src/bff/aggregators/talentReportV2Aggregator';

describe('assessTalentStructure', () => {
  it('领军10 骨干50 青苗20 → 健康结构', () => {
    const r = assessTalentStructure({ leaders: 10, mid: 50, junior: 20 });
    expect(r.balanced).toBe(true);
  });

  it('领军10 骨干5 青苗2 → 不平衡', () => {
    const r = assessTalentStructure({ leaders: 10, mid: 5, junior: 2 });
    expect(r.balanced).toBe(false);
  });
});

describe('buildTalentPipeline', () => {
  it('带头人10 后备20 青年30 → 深度50', () => {
    const r = buildTalentPipeline({ leaders: 10, backups: 20, young: 30 });
    expect(r.depth).toBe(50);
  });
});

describe('buildTalentReportV2', () => {
  it('生成领军数据', () => {
    const r = buildTalentReportV2('30d');
    expect(r.leading.distinguished).toBeGreaterThanOrEqual(0);
  });

  it('生成带头人数据', () => {
    const r = buildTalentReportV2('30d');
    expect(r.leaders.discipline).toBeGreaterThan(0);
  });

  it('生成招聘数据', () => {
    const r = buildTalentReportV2('30d');
    expect(r.recruitment.positions).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildTalentReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
