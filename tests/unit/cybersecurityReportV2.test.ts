/**
 * 健澜科技 jlmedaios - 网络安全 V2 纯函数单测（M227-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessSecurityPosture,
  buildCybersecurityReportV2,
  handleSecurityIncident,
} from '../../src/bff/aggregators/cybersecurityReportV2Aggregator';

describe('assessSecurityPosture', () => {
  it('8项达标 → 优秀', () => {
    expect(assessSecurityPosture(8).level).toBe('优秀');
  });

  it('5项达标 → 良好', () => {
    expect(assessSecurityPosture(5).level).toBe('良好');
  });
});

describe('handleSecurityIncident', () => {
  it('勒索病毒 → 紧急响应', () => {
    expect(handleSecurityIncident('勒索病毒').urgent).toBe(true);
  });

  it('常规告警 → 记录', () => {
    expect(handleSecurityIncident('常规告警').urgent).toBe(false);
  });
});

describe('buildCybersecurityReportV2', () => {
  it('生成边界数据', () => {
    const r = buildCybersecurityReportV2('30d');
    expect(r.perimeter.firewall).toBe(true);
  });

  it('生成终端数据', () => {
    const r = buildCybersecurityReportV2('30d');
    expect(r.endpoint.patched).toBeGreaterThan(0);
  });

  it('生成应用数据', () => {
    const r = buildCybersecurityReportV2('30d');
    expect(r.application.audited).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildCybersecurityReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
