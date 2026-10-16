/**
 * 健澜科技 jlmedaios - 急诊管理 V2 纯函数单测（M225-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessGreenChannelTime,
  buildEmergencyMgmtReportV2,
  triageEmergency,
} from '../../src/bff/aggregators/emergencyMgmtReportV2Aggregator';

describe('triageEmergency', () => {
  it('心跳骤停 体征异常3 → I级红区', () => {
    const r = triageEmergency('心跳骤停', 3);
    expect(r.level).toBe('I级');
    expect(r.area).toBe('红区');
  });

  it('腹痛 体征异常1 → III级黄区', () => {
    const r = triageEmergency('腹痛', 1);
    expect(r.level).toBe('III级');
  });
});

describe('assessGreenChannelTime', () => {
  it('进门0 溶栓30 → DNT 30分钟 达标', () => {
    const r = assessGreenChannelTime(0, 30);
    expect(r.doorToNeedle).toBe(30);
    expect(r.onTime).toBe(true);
  });

  it('进门0 溶栓90 → DNT 90分钟 不达标', () => {
    expect(assessGreenChannelTime(0, 90).onTime).toBe(false);
  });
});

describe('buildEmergencyMgmtReportV2', () => {
  it('生成分诊数据', () => {
    const r = buildEmergencyMgmtReportV2('30d');
    expect(r.triage.total).toBeGreaterThan(0);
  });

  it('生成绿色通道数据', () => {
    const r = buildEmergencyMgmtReportV2('30d');
    expect(r.greenChannel.chest).toBeGreaterThan(0);
  });

  it('生成输液数据', () => {
    const r = buildEmergencyMgmtReportV2('30d');
    expect(r.infusion.cases).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildEmergencyMgmtReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
