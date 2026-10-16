/**
 * 健澜科技 jlmedaios - 消防安保 V2 纯函数单测（M229-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessFireSafety,
  buildFireSecurityReportV2,
  handleViolenceIncident,
} from '../../src/bff/aggregators/fireSecurityReportV2Aggregator';

describe('assessFireSafety', () => {
  it('100设施 0隐患 → 优秀', () => {
    expect(assessFireSafety(100, 0).level).toBe('优秀');
  });

  it('80设施 1隐患 → 良好', () => {
    expect(assessFireSafety(80, 1).level).toBe('良好');
  });
});

describe('handleViolenceIncident', () => {
  it('持刀伤人 → 报警', () => {
    expect(handleViolenceIncident('持刀伤人事件').reported).toBe(true);
  });

  it('普通纠纷 → 常规处置', () => {
    expect(handleViolenceIncident('普通纠纷').reported).toBe(false);
  });
});

describe('buildFireSecurityReportV2', () => {
  it('生成消防数据', () => {
    const r = buildFireSecurityReportV2('30d');
    expect(r.fire.facilities).toBeGreaterThan(0);
  });

  it('生成安保数据', () => {
    const r = buildFireSecurityReportV2('30d');
    expect(r.security.cameras).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildFireSecurityReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
