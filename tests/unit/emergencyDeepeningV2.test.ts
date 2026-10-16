/**
 * 健澜科技 jlmedaios - 急救体系 V2 纯函数单测（M222-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessEmergencyResponse,
  buildEmergencyDeepeningV2,
  triagePatientV2,
} from '../../src/bff/aggregators/emergencyDeepeningV2Aggregator';

describe('assessEmergencyResponse', () => {
  it('调度5 到达5 → 10分钟 优秀', () => {
    expect(assessEmergencyResponse(5, 5).fast).toBe(true);
  });

  it('调度10 到达10 → 20分钟 延迟', () => {
    expect(assessEmergencyResponse(10, 10).level).toBe('延迟');
  });
});

describe('triagePatientV2', () => {
  it('心跳骤停 3异常 → 一级红区', () => {
    expect(triagePatientV2('心跳骤停', 3).red).toBe(true);
  });

  it('腹痛 1异常 → 三级', () => {
    expect(triagePatientV2('腹痛', 1).level).toBe('三级');
  });
});

describe('buildEmergencyDeepeningV2', () => {
  it('生成院前数据', () => {
    const r = buildEmergencyDeepeningV2('30d');
    expect(r.prehospital.calls).toBeGreaterThan(0);
  });

  it('生成分诊数据', () => {
    const r = buildEmergencyDeepeningV2('30d');
    expect(r.triage.level1).toBeGreaterThan(0);
  });

  it('生成培训数据', () => {
    const r = buildEmergencyDeepeningV2('30d');
    expect(r.training.cpr).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildEmergencyDeepeningV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
