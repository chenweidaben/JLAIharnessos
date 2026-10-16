/**
 * 健澜科技 jlmedaios - M161-A 数字孪生深化聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 streamDigitalTwinState / simulateHospitalFlow / predictResourceNeed。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  streamDigitalTwinState,
  simulateHospitalFlow,
  predictResourceNeed,
  type DeepFlowScenario,
} from '@/bff/aggregators/digitalTwinDeepAggregator';

const SCENARIOS: DeepFlowScenario[] = ['opd_peak', 'mass_casualty', 'or_failure'];

describe('streamDigitalTwinState', () => {
  it('返回定时快照：版本号为整数、含四态汇总与事件流', () => {
    const snap = streamDigitalTwinState('main', '6');
    expect(Number.isInteger(snap.version)).toBe(true);
    expect(snap.version).toBeGreaterThan(0);
    expect(snap.buildingId).toBe('main');
    expect(snap.floor).toBe('6');
    expect(snap.demo).toBe(true);
    expect(Array.isArray(snap.events)).toBe(true);
    expect(Array.isArray(snap.rooms)).toBe(true);
  });

  it('四态汇总守恒：空+占+隔离+维护 = 总床数', () => {
    const s = streamDigitalTwinState('main', '5').summary;
    expect(s.totalBeds).toBeGreaterThan(0);
    expect(s.available + s.occupied + s.isolation + s.maintenance).toBe(s.totalBeds);
    expect(s.occupancyRate).toBeGreaterThanOrEqual(0);
    expect(s.occupancyRate).toBeLessThanOrEqual(100);
  });

  it('同一轮询窗口内两次拉取版本号一致（稳定推送，不抖动）', () => {
    const a = streamDigitalTwinState('main');
    const b = streamDigitalTwinState('main');
    // 30s 窗口内连续两次调用必然同版本（毫秒级连续）
    expect(a.version).toBe(b.version);
  });

  it('事件的 seq 单调递增且派生自版本号', () => {
    const snap = streamDigitalTwinState('main', '5');
    for (let i = 0; i < snap.events.length; i += 1) {
      expect(snap.events[i].seq).toBe(snap.version * 1000 + i);
    }
  });

  it('未知楼宇回退 main；楼层过滤生效', () => {
    const snap = streamDigitalTwinState('not-exist', '5');
    expect(snap.buildingId).toBe('main');
    expect(snap.rooms.every((r) => r.floor === '5')).toBe(true);
  });
});

describe('simulateHospitalFlow', () => {
  it('三情景均产出 12 个时间步、峰值紧张度、处置建议', () => {
    for (const sc of SCENARIOS) {
      const r = simulateHospitalFlow(sc);
      expect(r.scenario).toBe(sc);
      expect(r.steps).toHaveLength(12);
      expect(r.peakStrain).toBeGreaterThanOrEqual(0);
      expect(r.peakStrain).toBeLessThanOrEqual(100);
      expect(r.actions.length).toBeGreaterThan(0);
      expect(r.scenarioNote.length).toBeGreaterThan(0);
    }
  });

  it('确定性：同参两次结果完全一致（种子固定）', () => {
    for (const sc of SCENARIOS) {
      expect(simulateHospitalFlow(sc).steps).toEqual(simulateHospitalFlow(sc).steps);
    }
  });

  it('批量伤员情景峰值紧张度显著高于门诊高峰', () => {
    const mc = simulateHospitalFlow('mass_casualty');
    const opd = simulateHospitalFlow('opd_peak');
    expect(mc.peakStrain).toBeGreaterThan(opd.peakStrain);
  });

  it('每步字段合法：候诊/收治/急诊占用非负，紧张度 0..100', () => {
    const r = simulateHospitalFlow('mass_casualty');
    for (const s of r.steps) {
      expect(s.arrivals).toBeGreaterThanOrEqual(0);
      expect(s.waiting).toBeGreaterThanOrEqual(0);
      expect(s.admitted).toBeGreaterThanOrEqual(0);
      expect(s.erBedsUsed).toBeGreaterThanOrEqual(0);
      expect(s.strain).toBeGreaterThanOrEqual(0);
      expect(s.strain).toBeLessThanOrEqual(100);
    }
  });
});

describe('predictResourceNeed', () => {
  it('粒度正确：hour=24 / day=7 / week=12', () => {
    expect(predictResourceNeed('hour', 'opd_peak').points).toHaveLength(24);
    expect(predictResourceNeed('day', 'opd_peak').points).toHaveLength(7);
    expect(predictResourceNeed('week', 'opd_peak').points).toHaveLength(12);
  });

  it('确定性：同参两次结果完全一致', () => {
    expect(predictResourceNeed('day', 'mass_casualty').points).toEqual(
      predictResourceNeed('day', 'mass_casualty').points,
    );
  });

  it('峰值缺口为非负整数', () => {
    for (const sc of SCENARIOS) {
      const r = predictResourceNeed('hour', sc);
      for (const key of ['beds', 'physicians', 'nurses', 'orRooms', 'erResus'] as const) {
        expect(r.gap[key]).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(r.gap[key])).toBe(true);
      }
    }
  });

  it('批量伤员抢救位缺口高于手术室故障情景', () => {
    const mc = predictResourceNeed('day', 'mass_casualty');
    const orf = predictResourceNeed('day', 'or_failure');
    expect(mc.gap.erResus).toBeGreaterThan(orf.gap.erResus);
  });

  it('每点资源需求均为非负整数，手术室/抢救位至少为 1', () => {
    const r = predictResourceNeed('week', 'opd_peak');
    for (const p of r.points) {
      expect(p.beds).toBeGreaterThanOrEqual(0);
      expect(p.physicians).toBeGreaterThanOrEqual(0);
      expect(p.nurses).toBeGreaterThanOrEqual(0);
      expect(p.orRooms).toBeGreaterThanOrEqual(1);
      expect(p.erResus).toBeGreaterThanOrEqual(1);
    }
  });
});
