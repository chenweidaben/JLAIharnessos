/**
 * 健澜科技 jlmedaios - M175-C 数字孪生 3D 聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 build3DDigitalTwin / render3DBuilding /
 *   simulate3DPatientFlow / optimize3DRoute 四个纯函数。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  build3DDigitalTwin,
  render3DBuilding,
  simulate3DPatientFlow,
  optimize3DRoute,
  type Vec3,
  type RouteObstacle,
} from '@/bff/aggregators/twin3DAggregator';

describe('build3DDigitalTwin', () => {
  it('未知楼宇回退到 main（门诊住院综合楼）', () => {
    const v = build3DDigitalTwin('not-exist');
    expect(v.buildingId).toBe('main');
    expect(v.demo).toBe(true);
  });

  it('main 楼含 5F 与 6F 两个楼层，楼层底面标高正确', () => {
    const v = build3DDigitalTwin('main');
    expect(v.floors.map((f) => f.floor).sort()).toEqual(['5', '6']);
    const f5 = v.floors.find((f) => f.floor === '5');
    const f6 = v.floors.find((f) => f.floor === '6');
    expect(f5?.z).toBeCloseTo(18.0, 1);
    expect(f6?.z).toBeCloseTo(22.5, 1);
  });

  it('每个房间都有三维包围盒（min.z < max.z，宽高为正）', () => {
    const v = build3DDigitalTwin('main');
    for (const f of v.floors) {
      for (const r of f.rooms) {
        expect(r.box.min.x).toBeLessThan(r.box.max.x);
        expect(r.box.min.y).toBeLessThan(r.box.max.y);
        expect(r.box.min.z).toBeLessThan(r.box.max.z);
        // 房间 z 区间应落在本楼层底面与顶棚之间
        expect(r.box.min.z).toBeGreaterThanOrEqual(f.z - 0.01);
      }
    }
  });

  it('床位四态汇总正确，占用率 = (占+隔离)/总床', () => {
    const v = build3DDigitalTwin('main');
    const s = v.summary;
    expect(s.totalBeds).toBeGreaterThan(0);
    expect(s.available + s.occupied + s.isolation + s.maintenance).toBe(s.totalBeds);
    const expectRate =
      Math.round(((s.occupied + s.isolation) / s.totalBeds) * 1000) / 10;
    expect(s.occupancyRate).toBe(expectRate);
  });

  it('急诊楼 1F 含急诊抢救/留观，z 标高为 0', () => {
    const v = build3DDigitalTwin('er-building');
    expect(v.floors).toHaveLength(1);
    expect(v.floors[0].z).toBeCloseTo(0, 1);
    expect(v.floors[0].rooms.some((r) => r.roomType === 'er')).toBe(true);
  });

  it('患者位置为脱敏 P-xxxx，仅占用/隔离床才有', () => {
    const v = build3DDigitalTwin('main');
    for (const f of v.floors) {
      for (const r of f.rooms) {
        for (const bed of r.beds) {
          if (bed.state === 'occupied' || bed.state === 'isolation') {
            expect(bed.patientRef).toMatch(/^P-\d+$/);
          } else {
            expect(bed.patientRef).toBeNull();
          }
        }
      }
    }
  });

  it('纯函数：同参两次结果一致（剥离 generatedAt）', () => {
    const strip = (s: string) => s.replace(/"generatedAt":"[^"]*"/, '');
    const a = strip(JSON.stringify(build3DDigitalTwin('main',)));
    const b = strip(JSON.stringify(build3DDigitalTwin('main')));
    expect(a).toBe(b);
  });
});

describe('render3DBuilding', () => {
  it('返回指定楼层的等距投影数据，画布宽高为正', () => {
    const r = render3DBuilding('main', '5');
    expect(r.floor).toBe('5');
    expect(r.canvas.width).toBeGreaterThan(0);
    expect(r.canvas.height).toBeGreaterThan(0);
  });

  it('每个房间投影出顶/左/右四个面（各四个屏幕点）', () => {
    const r = render3DBuilding('main', '6');
    expect(r.rooms.length).toBeGreaterThan(0);
    for (const room of r.rooms) {
      expect(room.top).toHaveLength(4);
      expect(room.left).toHaveLength(4);
      expect(room.right).toHaveLength(4);
      // 所有屏幕点落在画布内
      for (const p of [...room.top, ...room.left, ...room.right, room.label]) {
        expect(p.sx).toBeGreaterThanOrEqual(0);
        expect(p.sy).toBeGreaterThanOrEqual(0);
        expect(p.sx).toBeLessThanOrEqual(r.canvas.width);
        expect(p.sy).toBeLessThanOrEqual(r.canvas.height);
      }
    }
  });

  it('散点包含床位/设备/患者三类，颜色与床位四态对齐', () => {
    const r = render3DBuilding('main', '5');
    const beds = r.markers.filter((m) => m.kind === 'bed');
    expect(beds.length).toBeGreaterThan(0);
    const colors = new Set(beds.map((b) => b.color));
    // 至少出现占床深海蓝与隔离橙
    expect(colors.has('#1E5AA8')).toBe(true);
    expect(colors.has('#FA8C16')).toBe(true);
  });

  it('不传 floor 时取首层', () => {
    const r = render3DBuilding('er-building');
    expect(r.floor).toBe('1');
  });
});

describe('simulate3DPatientFlow', () => {
  it('三种情景均返回 24 步仿真曲线', () => {
    for (const sc of ['normal', 'surge', 'epidemic'] as const) {
      const r = simulate3DPatientFlow(sc);
      expect(r.steps).toBe(24);
      expect(r.occupancyCurve).toHaveLength(24);
      expect(r.note.length).toBeGreaterThan(0);
    }
  });

  it('确定性：同参两次轨迹一致（种子固定）', () => {
    const a = simulate3DPatientFlow('surge');
    const b = simulate3DPatientFlow('surge');
    expect(a.trajectories).toEqual(b.trajectories);
  });

  it('高峰情景每步新到患者数多于常态', () => {
    const normal = simulate3DPatientFlow('normal');
    const surge = simulate3DPatientFlow('surge');
    expect(surge.arrivalsPerStep).toBeGreaterThan(normal.arrivalsPerStep);
  });

  it('每条轨迹的患者标识均为脱敏 P-xxxx', () => {
    const r = simulate3DPatientFlow('epidemic');
    for (const tr of r.trajectories) {
      for (const f of tr) {
        expect(f.patientRef).toMatch(/^P-\d+$/);
        expect(f.position.z).toBeGreaterThan(0);
      }
    }
  });

  it('瓶颈节点返回平均等待分钟数（非负）', () => {
    const r = simulate3DPatientFlow('normal');
    expect(r.bottleneck.avgWaitMin).toBeGreaterThanOrEqual(0);
    expect(typeof r.bottleneck.stage).toBe('string');
  });
});

describe('optimize3DRoute', () => {
  const start: Vec3 = { x: 0, y: 0, z: 0 };
  const end: Vec3 = { x: 300, y: 0, z: 0 };

  it('无障碍物时找到直达路径（至少 2 个航点）', () => {
    const r = optimize3DRoute(start, end, []);
    expect(r.found).toBe(true);
    expect(r.waypoints.length).toBeGreaterThanOrEqual(2);
    // 首末航点对齐
    expect(r.waypoints[0].x).toBeCloseTo(start.x, 0);
    expect(r.waypoints[r.waypoints.length - 1].x).toBeCloseTo(end.x, 0);
  });

  it('路径长度为正米数', () => {
    const r = optimize3DRoute(start, end, []);
    expect(r.distanceM).toBeGreaterThan(0);
  });

  it('有障碍物时绕行：路径不穿入障碍物包围盒', () => {
    // 在 x=150 处放一堵墙（y 从 -50 到 50，z 从 0 到 3）
    const wall: RouteObstacle = {
      ref: 'wall-1',
      min: { x: 140, y: -50, z: 0 },
      max: { x: 160, y: 50, z: 3 },
    };
    const r = optimize3DRoute(start, end, [wall]);
    expect(r.found).toBe(true);
    // 校验每个航点不在墙内
    for (const wp of r.waypoints) {
      const inWall =
        wp.x >= wall.min.x && wp.x <= wall.max.x &&
        wp.y >= wall.min.y && wp.y <= wall.max.y &&
        wp.z >= wall.min.z && wp.z <= wall.max.z;
      expect(inWall).toBe(false);
    }
  });

  it('被堵死时降级为直线且 found=false', () => {
    // 三面围死：上下左右都堵，只留一条缝也没有
    const blockers: RouteObstacle[] = [
      { ref: 'a', min: { x: 100, y: -1000, z: -100 }, max: { x: 200, y: 1000, z: 100 } },
    ];
    const r = optimize3DRoute(start, end, blockers);
    // 全堵死 → 找不到 → 降级直线
    expect(r.waypoints.length).toBe(2);
    expect(r.distanceM).toBeGreaterThan(0);
  });

  it('纯函数：同参两次结果一致', () => {
    const wall: RouteObstacle = {
      ref: 'w', min: { x: 140, y: -50, z: 0 }, max: { x: 160, y: 50, z: 3 },
    };
    const a = optimize3DRoute(start, end, [wall]);
    const b = optimize3DRoute(start, end, [wall]);
    expect(a.waypoints).toEqual(b.waypoints);
    expect(a.distanceM).toBe(b.distanceM);
  });
});
