/**
 * 健澜科技 jlmedaios - v5.0启动 数字孪生 3D 住院试点聚合器纯函数单测（M182-D）。
 *
 * 不依赖数据库：仅测 buildTwin3DInpatient / trackBedStatus3D /
 *   simulateInpatientFlow 三个纯函数。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildTwin3DInpatient,
  trackBedStatus3D,
  simulateInpatientFlow,
} from '@/bff/aggregators/twin3DInpatientAggregator';

describe('buildTwin3DInpatient', () => {
  it('返回住院楼试点模型（pilot=true，buildingId=inpatient）', () => {
    const v = buildTwin3DInpatient();
    expect(v.buildingId).toBe('inpatient');
    expect(v.pilot).toBe(true);
  });

  it('含 7F/8F 两个住院楼层，底面标高正确', () => {
    const v = buildTwin3DInpatient();
    expect(v.floors.map((f) => f.floor).sort()).toEqual(['7', '8']);
    const f7 = v.floors.find((f) => f.floor === '7');
    const f8 = v.floors.find((f) => f.floor === '8');
    expect(f7?.z).toBeCloseTo(27.0, 1);
    expect(f8?.z).toBeCloseTo(31.5, 1);
  });

  it('每层均含病房/护士站/治疗室/配药室四类房间', () => {
    const v = buildTwin3DInpatient();
    for (const f of v.floors) {
      const types = new Set(f.rooms.map((r) => r.roomType));
      expect(types.has('ward')).toBe(true);
      expect(types.has('nurse_station')).toBe(true);
      expect(types.has('treatment_room')).toBe(true);
      expect(types.has('dispensing_room')).toBe(true);
    }
  });

  it('每个病房床位落在房间包围盒内，z=楼层底+0.45m', () => {
    const v = buildTwin3DInpatient();
    for (const f of v.floors) {
      for (const r of f.rooms) {
        for (const bed of r.beds) {
          expect(bed.position.x).toBeGreaterThanOrEqual(r.box.min.x);
          expect(bed.position.x).toBeLessThanOrEqual(r.box.max.x);
          expect(bed.position.y).toBeGreaterThanOrEqual(r.box.min.y);
          expect(bed.position.y).toBeLessThanOrEqual(r.box.max.y);
          expect(bed.position.z).toBeCloseTo(f.z + 0.45, 2);
        }
      }
    }
  });

  it('床位四态汇总正确，占用率=(占+隔离+出院准备)/总床', () => {
    const v = buildTwin3DInpatient();
    const s = v.summary;
    expect(s.totalBeds).toBeGreaterThan(0);
    expect(s.available + s.occupied + s.isolation + s.dischargeReady).toBe(s.totalBeds);
    const expectRate =
      Math.round(((s.occupied + s.isolation + s.dischargeReady) / s.totalBeds) * 1000) / 10;
    expect(s.occupancyRate).toBe(expectRate);
  });

  it('每层护士站负荷监控字段齐全（待执行医嘱/护理任务/在岗/负荷等级）', () => {
    const v = buildTwin3DInpatient();
    for (const f of v.floors) {
      const ns = f.nurseStation;
      expect(ns.stationName.length).toBeGreaterThan(0);
      expect(ns.pendingOrders).toBeGreaterThanOrEqual(0);
      expect(ns.pendingNursingTasks).toBeGreaterThanOrEqual(0);
      expect(ns.staffOnDuty).toBeGreaterThan(0);
      expect(['idle', 'normal', 'busy', 'overload']).toContain(ns.loadLevel);
    }
  });

  it('患者位置为脱敏 P-xxxx，仅空床无患者', () => {
    const v = buildTwin3DInpatient();
    for (const f of v.floors) {
      for (const r of f.rooms) {
        for (const bed of r.beds) {
          if (bed.state === 'available') {
            expect(bed.patientRef).toBeNull();
          } else {
            expect(bed.patientRef).toMatch(/^P-\d+$/);
          }
        }
      }
    }
  });

  it('纯函数：同参两次结果一致（剥离 generatedAt）', () => {
    const strip = (s: string) => s.replace(/"generatedAt":"[^"]*"/, '');
    const a = strip(JSON.stringify(buildTwin3DInpatient()));
    const b = strip(JSON.stringify(buildTwin3DInpatient()));
    expect(a).toBe(b);
  });
});

describe('trackBedStatus3D', () => {
  it('7F 返回全部 7 楼床位，且只含 7 楼房间', () => {
    const r = trackBedStatus3D('inpatient', '7');
    expect(r.floor).toBe('7');
    expect(r.beds.length).toBeGreaterThan(0);
    for (const bed of r.beds) {
      expect(bed.floor).toBe('7');
      expect(bed.roomCode.startsWith('7')).toBe(true);
    }
  });

  it('四态计数之和等于床位数，占用率公式正确', () => {
    const r = trackBedStatus3D('inpatient', '8');
    const { counts, beds } = r;
    expect(counts.available + counts.occupied + counts.isolation + counts.discharge_ready).toBe(beds.length);
    const inUse = counts.occupied + counts.isolation + counts.discharge_ready;
    const expectRate = Math.round((inUse / beds.length) * 1000) / 10;
    expect(r.occupancyRate).toBe(expectRate);
  });

  it('床位 z = 楼层底 31.5 + 0.45 = 31.95', () => {
    const r = trackBedStatus3D('inpatient', '8');
    for (const bed of r.beds) {
      expect(bed.position.z).toBeCloseTo(31.95, 2);
    }
  });

  it('未知楼层返回空床位列表与零计数', () => {
    const r = trackBedStatus3D('inpatient', '99');
    expect(r.beds).toHaveLength(0);
    expect(r.occupancyRate).toBe(0);
    expect(r.counts.available).toBe(0);
  });
});

describe('simulateInpatientFlow', () => {
  it('三种情景均返回 30 天仿真曲线', () => {
    for (const sc of ['normal', 'busy', 'surge'] as const) {
      const r = simulateInpatientFlow(sc);
      expect(r.days).toBe(30);
      expect(r.censusCurve).toHaveLength(30);
      expect(r.note.length).toBeGreaterThan(0);
    }
  });

  it('确定性：同参两次轨迹一致（种子固定）', () => {
    const a = simulateInpatientFlow('busy');
    const b = simulateInpatientFlow('busy');
    expect(a.trajectories).toEqual(b.trajectories);
    expect(a.censusCurve).toEqual(b.censusCurve);
  });

  it('高峰情景日均入院多于常态', () => {
    const normal = simulateInpatientFlow('normal');
    const surge = simulateInpatientFlow('surge');
    expect(surge.admissionsPerDay).toBeGreaterThan(normal.admissionsPerDay);
  });

  it('轨迹患者标识脱敏 P-xxxx，阶段按 入院→住院→治疗→出院准备 顺序推进', () => {
    const r = simulateInpatientFlow('normal');
    expect(r.trajectories.length).toBeGreaterThan(0);
    const order: string[] = ['admission', 'inpatient', 'treatment', 'discharge_ready'];
    for (const tr of r.trajectories) {
      expect(tr.length).toBeGreaterThan(0);
      let maxStageIdx = -1;
      for (const f of tr) {
        expect(f.patientRef).toMatch(/^P-\d+$/);
        if (f.stage === 'discharge') continue;
        const idx = order.indexOf(f.stage);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeGreaterThanOrEqual(maxStageIdx);
        maxStageIdx = idx;
      }
    }
  });

  it('瓶颈阶段返回平均滞留天数（非负，且为住院路径阶段）', () => {
    const r = simulateInpatientFlow('surge');
    expect(r.bottleneck.avgStayDays).toBeGreaterThanOrEqual(0);
    expect(['admission', 'inpatient', 'treatment', 'discharge_ready']).toContain(r.bottleneck.stage);
  });

  it('平均住院日为正数', () => {
    const r = simulateInpatientFlow('normal');
    expect(r.avgLOSDays).toBeGreaterThan(0);
  });
});
