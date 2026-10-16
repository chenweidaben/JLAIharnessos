/**
 * 健澜科技 jlmedaios - 数据治理 V2 纯函数单测（M227-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessDataQuality,
  buildDataGovernanceReportV2,
  classifyDataLevel,
} from '../../src/bff/aggregators/dataGovernanceReportV2Aggregator';

describe('assessDataQuality', () => {
  it('5维达标 → 优秀', () => {
    expect(assessDataQuality(5).level).toBe('优秀');
  });

  it('3维达标 → 良好', () => {
    expect(assessDataQuality(3).level).toBe('良好');
  });
});

describe('classifyDataLevel', () => {
  it('病历数据 → 敏感 脱敏', () => {
    const r = classifyDataLevel('病历数据');
    expect(r.level).toBe('敏感');
    expect(r.masked).toBe(true);
  });

  it('财务数据 → 核心 脱敏', () => {
    expect(classifyDataLevel('财务数据').level).toBe('核心');
  });
});

describe('buildDataGovernanceReportV2', () => {
  it('生成标准数据', () => {
    const r = buildDataGovernanceReportV2('30d');
    expect(r.standards.defined).toBeGreaterThan(0);
  });

  it('生成资产数据', () => {
    const r = buildDataGovernanceReportV2('30d');
    expect(r.asset.catalog).toBeGreaterThan(0);
  });

  it('生成服务数据', () => {
    const r = buildDataGovernanceReportV2('30d');
    expect(r.service.api).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildDataGovernanceReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
