/**
 * 健澜科技 jlmedaios - 急诊 V3 纯函数单测（M204-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessGreenChannelTime,
  buildEmergencyReportV3,
  classifyEmergencyLevel,
  type GreenChannelWindowV3,
  type TriageDataV3,
} from '../../src/bff/aggregators/emergencyReportV3Aggregator';

describe('classifyEmergencyLevel', () => {
  it('低血压+意识差 → I 级濒危', () => {
    const t: TriageDataV3 = { systolicBp: 70, heartRate: 120, respiration: 35, consciousness: 6 };
    const r = classifyEmergencyLevel(t);
    expect(r.level).toContain('I');
    expect(r.waitTimeMin).toBe(0);
  });

  it('常规 → IV 级', () => {
    const t: TriageDataV3 = { systolicBp: 120, heartRate: 80, respiration: 16, consciousness: 15 };
    const r = classifyEmergencyLevel(t);
    expect(r.level).toContain('IV');
  });
});

describe('assessGreenChannelTime', () => {
  it('全部达标 → compliant', () => {
    const w: GreenChannelWindowV3 = { doorToBalloonMin: 60, doorToNeedleMin: 30, traumaRescueMin: 30 };
    const r = assessGreenChannelTime(w);
    expect(r.compliant).toBe(true);
    expect(r.breaches.length).toBe(0);
  });

  it('D-to-B 超时 → 违规', () => {
    const w: GreenChannelWindowV3 = { doorToBalloonMin: 120, doorToNeedleMin: 30, traumaRescueMin: 30 };
    const r = assessGreenChannelTime(w);
    expect(r.compliant).toBe(false);
    expect(r.breaches.length).toBeGreaterThan(0);
  });
});

describe('buildEmergencyReportV3', () => {
  it('生成分诊数据', () => {
    const r = buildEmergencyReportV3('30d');
    expect(r.triage.total).toBeGreaterThan(0);
  });

  it('生成抢救数据', () => {
    const r = buildEmergencyReportV3('30d');
    expect(r.resuscitation.successRate).toBeGreaterThan(0);
  });

  it('生成绿色通道数据', () => {
    const r = buildEmergencyReportV3('30d');
    expect(r.greenChannel.chestPain).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildEmergencyReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
