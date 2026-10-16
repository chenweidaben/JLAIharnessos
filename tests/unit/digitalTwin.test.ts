/**
 * 健澜科技 jlmedaios - M160-B 数字孪生 2D 聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 buildDigitalTwinBuilding / updateDigitalTwinState / simulateBedUsage。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDigitalTwinBuilding,
  updateDigitalTwinState,
  simulateBedUsage,
  type BedState,
} from '@/bff/aggregators/digitalTwinAggregator';

describe('buildDigitalTwinBuilding', () => {
  it('未知楼宇回退到 main（门诊住院综合楼）', () => {
    const v = buildDigitalTwinBuilding('not-exist');
    expect(v.buildingId).toBe('main');
    expect(v.demo).toBe(true);
  });

  it('不传楼层时返回 main 楼全部楼层房间', () => {
    const v = buildDigitalTwinBuilding('main');
    // 5F: 501/502/503/5-N（4 间）；6F: 601/602/OR-01/OR-02/OR-03（5 间）
    expect(v.rooms.length).toBe(9);
    expect(v.floors).toEqual(['5', '6']);
  });

  it('floor=5 只返回 5 楼房间，且楼层字段统一为 5', () => {
    const v = buildDigitalTwinBuilding('main', '5');
    expect(v.rooms.length).toBe(4);
    expect(v.rooms.every((r) => r.floor === '5')).toBe(true);
  });

  it('floor=6 只返回 6 楼房间（含手术室）', () => {
    const v = buildDigitalTwinBuilding('main', '6');
    expect(v.rooms.length).toBe(5);
    expect(v.rooms.some((r) => r.roomType === 'operating_room')).toBe(true);
  });

  it('急诊楼 er-building 1 层含急诊抢救/留观诊室', () => {
    const v = buildDigitalTwinBuilding('er-building');
    expect(v.rooms.length).toBe(3);
    expect(v.rooms.some((r) => r.roomType === 'er')).toBe(true);
  });

  it('床位四态汇总正确，占用率 = (占+隔离)/总床', () => {
    const v = buildDigitalTwinBuilding('main', '5');
    const s = v.summary;
    expect(s.totalBeds).toBeGreaterThan(0);
    expect(s.available + s.occupied + s.isolation + s.maintenance).toBe(s.totalBeds);
    const expectRate =
      Math.round(((s.occupied + s.isolation) / s.totalBeds) * 1000) / 10;
    expect(s.occupancyRate).toBe(expectRate);
    // 5 楼演示数据：含隔离床（CCU）
    expect(s.isolation).toBeGreaterThan(0);
  });

  it('患者位置为脱敏 P-xxxx 标识，仅占用/隔离床才有', () => {
    const v = buildDigitalTwinBuilding('main', '5');
    for (const room of v.rooms) {
      for (const bed of room.beds) {
        if (bed.state === 'occupied' || bed.state === 'isolation') {
          expect(bed.patientRef).toMatch(/^P-\d+$/);
        } else {
          expect(bed.patientRef).toBeNull();
        }
      }
      for (const m of room.patientMarkers) {
        expect(m.patientRef).toMatch(/^P-\d+$/);
      }
    }
  });

  it('房间坐标落在 0..1000 / 0..560 网格内', () => {
    const v = buildDigitalTwinBuilding('main');
    for (const r of v.rooms) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(1000);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.y + r.height).toBeLessThanOrEqual(560);
    }
  });

  it('不修改入参（纯函数）', () => {
    const before = JSON.stringify(buildDigitalTwinBuilding('main', '6'));
    buildDigitalTwinBuilding('main', '6');
    const after = JSON.stringify(buildDigitalTwinBuilding('main', '6'));
    // 布局部分一致（generatedAt 随时间变，剥离后比对）
    const strip = (s: string) => s.replace(/"generatedAt":"[^"]*"/, '');
    expect(strip(after)).toBe(strip(before));
  });
});

describe('updateDigitalTwinState', () => {
  it('合法状态返回不可变补丁（roomId/state/时间戳齐全）', () => {
    const patch = updateDigitalTwinState('main-5-501', 'isolation');
    expect(patch.roomId).toBe('main-5-501');
    expect(patch.state).toBe('isolation');
    expect(typeof patch.seq).toBe('number');
    expect(typeof patch.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(patch.updatedAt))).toBe(false);
  });

  it('非法状态 fail-fast 抛错', () => {
    expect(() => updateDigitalTwinState('main-5-501', 'weird' as BedState)).toThrow();
  });

  it('空 roomId 抛错', () => {
    expect(() => updateDigitalTwinState('   ', 'available')).toThrow();
  });

  it('四种合法状态均被接受', () => {
    for (const s of ['available', 'occupied', 'isolation', 'maintenance'] as BedState[]) {
      expect(updateDigitalTwinState('r-1', s).state).toBe(s);
    }
  });
});

describe('simulateBedUsage', () => {
  it('粒度正确：hour=24 / day=7 / week=12', () => {
    expect(simulateBedUsage('hour', 'normal').points).toHaveLength(24);
    expect(simulateBedUsage('day', 'normal').points).toHaveLength(7);
    expect(simulateBedUsage('week', 'normal').points).toHaveLength(12);
  });

  it('确定性：同参两次结果一致（种子固定）', () => {
    const a = simulateBedUsage('hour', 'surge');
    const b = simulateBedUsage('hour', 'surge');
    expect(a.points).toEqual(b.points);
  });

  it('疫情情景隔离床显著高于常态', () => {
    const normal = simulateBedUsage('day', 'normal');
    const epidemic = simulateBedUsage('day', 'epidemic');
    const avg = (p: typeof normal.points) =>
      p.reduce((s, x) => s + x.isolation, 0) / p.length;
    expect(avg(epidemic.points)).toBeGreaterThan(avg(normal.points));
  });

  it('高峰情景占用率高于维护情景', () => {
    const surge = simulateBedUsage('day', 'surge');
    const maint = simulateBedUsage('day', 'maintenance');
    const avg = (p: typeof surge.points) =>
      p.reduce((s, x) => s + x.occupancyRate, 0) / p.length;
    expect(avg(surge.points)).toBeGreaterThan(avg(maint.points));
  });

  it('每点四态之和 ≈ 总床位数，占用率在 0..100', () => {
    const r = simulateBedUsage('hour', 'epidemic');
    expect(r.totalBeds).toBe(60);
    for (const p of r.points) {
      const sum = p.available + p.occupied + p.isolation + p.maintenance;
      expect(sum).toBe(r.totalBeds);
      expect(p.occupancyRate).toBeGreaterThanOrEqual(0);
      expect(p.occupancyRate).toBeLessThanOrEqual(100);
    }
  });
});
