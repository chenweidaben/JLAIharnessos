/**
 * 健澜科技 jlmedaios - M170-B 数字孪生多建筑与仿真聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 buildMultiBuildingTwin / simulatePatientFlow /
 * predictCrowdDensity / optimizePatientRoute。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildMultiBuildingTwin,
  simulatePatientFlow,
  predictCrowdDensity,
  optimizePatientRoute,
  crowdLevelOf,
  type FlowScenario,
} from '@/bff/aggregators/twinDeepAggregator';

const SCENARIOS: FlowScenario[] = ['normal', 'morning_peak', 'epidemic', 'mass_casualty'];

describe('buildMultiBuildingTwin', () => {
  it('默认返回全院四类楼宇：门诊/住院/医技/急诊', () => {
    const twin = buildMultiBuildingTwin();
    expect(twin.totalBuildings).toBe(4);
    expect(twin.demo).toBe(true);
    const kinds = twin.buildings.map((b) => b.kind).sort();
    expect(kinds).toEqual(['emergency', 'inpatient', 'medical_tech', 'outpatient']);
    expect(twin.totalZones).toBeGreaterThan(10);
  });

  it('每楼宇含楼层/分区/2D 坐标与密度分级，汇总守恒', () => {
    const twin = buildMultiBuildingTwin();
    for (const b of twin.buildings) {
      expect(b.floors.length).toBe(b.summary.floors);
      expect(b.zones.length).toBe(b.summary.zones);
      expect(b.zones.length).toBeGreaterThan(0);
      for (const z of b.zones) {
        // 2D 平面坐标落在 0..1000 视口内
        expect(z.x).toBeGreaterThanOrEqual(0);
        expect(z.y).toBeGreaterThanOrEqual(0);
        expect(z.w).toBeGreaterThan(0);
        expect(['low', 'medium', 'high', 'crowded']).toContain(z.crowdLevel);
      }
      // 汇总：总容量/基线 = 各分区求和
      const cap = b.zones.reduce((s, z) => s + z.capacity, 0);
      const base = b.zones.reduce((s, z) => s + z.crowdBaseline, 0);
      expect(b.summary.totalCapacity).toBe(cap);
      expect(b.summary.totalCrowdBaseline).toBe(base);
    }
  });

  it('按楼宇编号过滤；未知回退全院', () => {
    const only = buildMultiBuildingTwin(['opd-building']);
    expect(only.totalBuildings).toBe(1);
    expect(only.buildings[0].kind).toBe('outpatient');

    const fallback = buildMultiBuildingTwin(['not-exist']);
    expect(fallback.totalBuildings).toBe(4);

    const empty = buildMultiBuildingTwin([]);
    expect(empty.totalBuildings).toBe(4);
  });

  it('密度分级阈值正确（crowdLevelOf）', () => {
    expect(crowdLevelOf(30)).toBe('low');
    expect(crowdLevelOf(90)).toBe('medium');
    expect(crowdLevelOf(180)).toBe('high');
    expect(crowdLevelOf(300)).toBe('crowded');
  });
});

describe('simulatePatientFlow', () => {
  it('每情景产出 12 个时间步，字段合法（候诊/已服务/溢出非负，紧张度 0..100）', () => {
    for (const sc of SCENARIOS) {
      const r = simulatePatientFlow('opd-building', sc);
      expect(r.ticks).toHaveLength(12);
      expect(r.peakStrain).toBeGreaterThanOrEqual(0);
      expect(r.peakStrain).toBeLessThanOrEqual(100);
      expect(r.actions.length).toBeGreaterThan(0);
      for (const t of r.ticks) {
        expect(t.arrivals).toBeGreaterThanOrEqual(0);
        expect(t.waiting).toBeGreaterThanOrEqual(0);
        expect(t.served).toBeGreaterThanOrEqual(0);
        expect(t.overflow).toBeGreaterThanOrEqual(0);
        expect(t.strain).toBeGreaterThanOrEqual(0);
        expect(t.strain).toBeLessThanOrEqual(100);
      }
    }
  });

  it('确定性：同参两次结果完全一致', () => {
    for (const sc of SCENARIOS) {
      expect(simulatePatientFlow('tech-building', sc).ticks).toEqual(
        simulatePatientFlow('tech-building', sc).ticks,
      );
    }
  });

  it('批量伤员峰值紧张度显著高于常态', () => {
    const mc = simulatePatientFlow('er-building', 'mass_casualty');
    const nm = simulatePatientFlow('er-building', 'normal');
    expect(mc.peakStrain).toBeGreaterThan(nm.peakStrain);
  });

  it('未知楼宇回退门诊楼；已服务单调不减', () => {
    const r = simulatePatientFlow('ghost', 'normal');
    expect(r.building).toBe('opd-building');
    for (let i = 1; i < r.ticks.length; i += 1) {
      expect(r.ticks[i].served).toBeGreaterThanOrEqual(r.ticks[i - 1].served);
    }
  });
});

describe('predictCrowdDensity', () => {
  it('粒度正确：hour=24 / day=7，等级合法，热点分区非空', () => {
    expect(predictCrowdDensity('opd-building', 'hour').points).toHaveLength(24);
    expect(predictCrowdDensity('opd-building', 'day').points).toHaveLength(7);

    const r = predictCrowdDensity('er-building', 'hour');
    for (const p of r.points) {
      expect(['low', 'medium', 'high', 'crowded']).toContain(p.level);
      expect(p.crowd).toBeGreaterThanOrEqual(0);
      expect(p.hotZones.length).toBeGreaterThan(0);
    }
  });

  it('确定性：同参两次结果完全一致', () => {
    expect(predictCrowdDensity('ipd-building', 'day').points).toEqual(
      predictCrowdDensity('ipd-building', 'day').points,
    );
  });

  it('峰值在院人数 = 各点最大值', () => {
    const r = predictCrowdDensity('tech-building', 'hour');
    expect(r.peakCrowd).toBe(Math.max(...r.points.map((p) => p.crowd)));
  });

  it('门诊楼上午时段（约 10:00）密度高于凌晨（约 03:00）', () => {
    const r = predictCrowdDensity('opd-building', 'hour');
    const at10 = r.points.find((p) => p.t === '10:00')!.crowd;
    const at3 = r.points.find((p) => p.t === '03:00')!.crowd;
    expect(at10).toBeGreaterThan(at3);
  });
});

describe('optimizePatientRoute', () => {
  it('返回路径：起点=start、终点=end、相邻点在邻接表内连通', () => {
    const r = optimizePatientRoute('opd-building', 'OPD-大厅', 'OPD-内科');
    expect(r.path[0]).toBe('OPD-大厅');
    expect(r.path[r.path.length - 1]).toBe('OPD-内科');
    expect(r.pathNames).toHaveLength(r.path.length);
    expect(r.estMinutes).toBeGreaterThan(0);
    expect(r.distance).toBeGreaterThan(0);
    expect(['smooth', 'moderate', 'crowded']).toContain(r.congestion);

    // 相邻两点必须在邻接图内互通
    const twin = buildMultiBuildingTwin(['opd-building']);
    const zones = new Map(twin.buildings[0].zones.map((z) => [z.zoneCode, z]));
    for (let i = 1; i < r.path.length; i += 1) {
      const prev = zones.get(r.path[i - 1])!;
      expect(prev.neighbors).toContain(r.path[i]);
    }
  });

  it('住院楼跨层经电梯厅连通（5F↔6F）', () => {
    const r = optimizePatientRoute('ipd-building', 'IPD-501', 'IPD-601');
    expect(r.path[0]).toBe('IPD-501');
    expect(r.path[r.path.length - 1]).toBe('IPD-601');
    // 必须借助电梯厅跨层
    expect(r.path).toContain('IPD-电梯厅');
  });

  it('确定性：同参两次路径完全一致', () => {
    expect(optimizePatientRoute('tech-building', 'TECH-2大厅', 'TECH-OR2').path).toEqual(
      optimizePatientRoute('tech-building', 'TECH-2大厅', 'TECH-OR2').path,
    );
  });

  it('非法入参 fail-fast：未知楼宇 / 未知节点 / 起终点相同均抛错', () => {
    expect(() => optimizePatientRoute('ghost', 'A', 'B')).toThrow();
    expect(() => optimizePatientRoute('opd-building', 'NOPE', 'OPD-内科')).toThrow();
    expect(() => optimizePatientRoute('opd-building', 'OPD-大厅', 'OPD-大厅')).toThrow();
  });
});
