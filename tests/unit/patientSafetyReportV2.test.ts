/**
 * 健澜科技 jlmedaios - 患者安全 V2 纯函数单测（M209-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatientSafetyReportV2,
  classifyAdverseEventLevel,
  conductRCA,
  type AdverseEvent,
  type RCAEvent,
} from '../../src/bff/aggregators/patientSafetyReportV2Aggregator';

describe('classifyAdverseEventLevel', () => {
  it('死亡 → I 级', () => {
    const e: AdverseEvent = { severity: 5, death: true };
    const r = classifyAdverseEventLevel(e);
    expect(r.level).toBe('I级（警告事件）');
  });

  it('轻微 → IV 级', () => {
    const e: AdverseEvent = { severity: 1, death: false };
    const r = classifyAdverseEventLevel(e);
    expect(r.level).toBe('IV级（隐患事件）');
  });
});

describe('conductRCA', () => {
  it('3 次用药错误 → 根因是用药错误', () => {
    const events: RCAEvent[] = [
      { category: '用药错误' },
      { category: '用药错误' },
      { category: '用药错误' },
      { category: '跌倒' },
    ];
    const r = conductRCA(events);
    expect(r.topCause).toBe('用药错误');
    expect(r.frequency).toBe(3);
  });
});

describe('buildPatientSafetyReportV2', () => {
  it('生成事件数据', () => {
    const r = buildPatientSafetyReportV2('30d');
    expect(r.events.levelI).toBeGreaterThanOrEqual(0);
  });

  it('生成用药安全数据', () => {
    const r = buildPatientSafetyReportV2('30d');
    expect(r.medication.highAlert).toBeGreaterThan(0);
  });

  it('生成文化数据', () => {
    const r = buildPatientSafetyReportV2('30d');
    expect(r.culture.justCulture).toBe(true);
  });

  it('生成建议', () => {
    const r = buildPatientSafetyReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
