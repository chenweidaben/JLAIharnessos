/**
 * 健澜科技 jlmedaios - 运维管理 V2 纯函数单测（M227-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessSystemAvailability,
  buildOpsReportV2,
  handleIncident,
} from '../../src/bff/aggregators/opsReportV2Aggregator';

describe('assessSystemAvailability', () => {
  it('720小时 故障30分钟 → 99.93% SLA达标', () => {
    const r = assessSystemAvailability(720, 30);
    expect(r.sla).toBe(true);
  });

  it('720小时 故障200分钟 → 99.54% SLA不达标', () => {
    expect(assessSystemAvailability(720, 200).sla).toBe(false);
  });
});

describe('handleIncident', () => {
  it('工单100 SLA30 → 达标', () => {
    expect(handleIncident(100, 30).onTime).toBe(true);
  });
});

describe('buildOpsReportV2', () => {
  it('生成基础设施数据', () => {
    const r = buildOpsReportV2('30d');
    expect(r.infrastructure.servers).toBeGreaterThan(0);
  });

  it('生成监控数据', () => {
    const r = buildOpsReportV2('30d');
    expect(r.monitoring.apm).toBeGreaterThan(0);
  });

  it('生成事件数据', () => {
    const r = buildOpsReportV2('30d');
    expect(r.incident.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildOpsReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
