/**
 * 健澜科技 jlmedaios — 【集团与科研】医院集团多院管理聚合器纯函数单测（M156-A）
 *
 * 覆盖：
 *  - 集团大屏 buildGroupDashboard：院级指标按 hospital_id 归并、集团汇总求和、
 *    满意度均分、统一标准分类计数、冷启动 demo 标记；
 *  - 医院对比 compareHospitals：排名 / 集团均值 / 偏离度 / 周期过滤 / 非法指标防空；
 *  - 资源优化 optimizeGroupResource：高负载院 / 低负载院识别、调配动作配对、
 *    负载均衡无建议、未知资源类型防空。
 *
 * 仅测纯函数，不触碰 IO / 时钟（时间戳统一注入 'NOW'）。
 * 数据隔离口径：每个快照行自带 hospital_id，跨院只在聚合层横向比较。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildGroupDashboard,
  compareHospitals,
  optimizeGroupResource,
  OVERLOAD_THRESHOLD,
  IDLE_THRESHOLD,
  type GroupInput,
  type HospitalMetricSnapshot,
} from '../../src/bff/aggregators/groupMultiHospitalAggregator';

/** 三家成员院基线样本：总院饱和、分院中等、协作院闲置 */
function baseMetrics(): HospitalMetricSnapshot[] {
  return [
    {
      hospitalId: 'h-head',
      hospitalName: '健澜总院',
      period: '2026-10',
      outpatientVolume: 90000,
      inpatientVolume: 8000,
      surgeryVolume: 4000,
      revenue: 10000,
      satisfaction: 90,
      expertLoad: 90,
      equipmentLoad: 70,
      bedOccupancy: 95,
    },
    {
      hospitalId: 'h-b1',
      hospitalName: '城东分院',
      period: '2026-10',
      outpatientVolume: 50000,
      inpatientVolume: 4000,
      surgeryVolume: 2000,
      revenue: 5000,
      satisfaction: 80,
      expertLoad: 50,
      equipmentLoad: 80,
      bedOccupancy: 60,
    },
    {
      hospitalId: 'h-b2',
      hospitalName: '临平协作院',
      period: '2026-10',
      outpatientVolume: 10000,
      inpatientVolume: 1000,
      surgeryVolume: 500,
      revenue: 1000,
      satisfaction: 100,
      expertLoad: 40,
      equipmentLoad: 30,
      bedOccupancy: 50,
    },
  ];
}

function baseInput(overrides: Partial<GroupInput> = {}): GroupInput {
  return {
    groupName: '健澜医疗集团',
    headHospitalId: 'h-head',
    members: [
      { hospitalId: 'h-head', hospitalName: '健澜总院', hospitalLevel: '三级甲等', memberRole: 'head' },
      { hospitalId: 'h-b1', hospitalName: '城东分院', hospitalLevel: '三级乙等', memberRole: 'branch' },
      { hospitalId: 'h-b2', hospitalName: '临平协作院', hospitalLevel: '二级甲等', memberRole: 'member' },
    ],
    metrics: baseMetrics(),
    standards: [
      { category: 'clinic', name: '诊疗规范A', standardCode: 'C1', version: 'v1', enforceLevel: 'mandatory' },
      { category: 'qc', name: '质控标准B', standardCode: 'Q1', version: 'v1', enforceLevel: 'mandatory' },
      { category: 'safety', name: '安全制度C', standardCode: 'S1', version: 'v1', enforceLevel: 'recommended' },
    ],
    ...overrides,
  };
}

describe('buildGroupDashboard 集团大屏聚合', () => {
  it('五项核心指标：量类求和、满意度取均值', () => {
    const d = buildGroupDashboard('g1', baseInput(), 'NOW');
    expect(d.totals.outpatientVolume).toBe(150000); // 90000+50000+10000
    expect(d.totals.inpatientVolume).toBe(13000);
    expect(d.totals.surgeryVolume).toBe(6500);
    expect(d.totals.revenue).toBe(16000); // 10000+5000+1000
    expect(d.totals.satisfactionAvg).toBe(90); // (90+80+100)/3
  });

  it('各院指标卡按 hospital_id 一一对应，不串院', () => {
    const d = buildGroupDashboard('g1', baseInput(), 'NOW');
    expect(d.hospitals).toHaveLength(3);
    const head = d.hospitals.find((h) => h.hospitalId === 'h-head');
    expect(head?.outpatientVolume).toBe(90000);
    expect(head?.bedOccupancy).toBe(95);
    const b2 = d.hospitals.find((h) => h.hospitalId === 'h-b2');
    expect(b2?.outpatientVolume).toBe(10000);
    expect(b2?.satisfaction).toBe(100);
  });

  it('统一标准分类计数 + 强制项计数', () => {
    const d = buildGroupDashboard('g1', baseInput(), 'NOW');
    expect(d.standards.total).toBe(3);
    expect(d.standards.mandatory).toBe(2);
    expect(d.standards.byCategory).toEqual({ clinic: 1, qc: 1, safety: 1 });
  });

  it('冷启动（无院籍）demo 置位、总量为零', () => {
    const d = buildGroupDashboard('g1', {}, 'NOW');
    expect(d.demo).toBe(true);
    expect(d.memberCount).toBe(0);
    expect(d.totals.outpatientVolume).toBe(0);
    expect(d.hospitals).toEqual([]);
  });

  it('有院籍但指标全零 → demo 置位', () => {
    const d = buildGroupDashboard(
      'g1',
      { members: baseInput().members, metrics: [] },
      'NOW',
    );
    expect(d.demo).toBe(true);
    expect(d.memberCount).toBe(3);
  });

  it('asOf / groupId 透传', () => {
    const d = buildGroupDashboard('g-xyz', baseInput(), 'NOW');
    expect(d.groupId).toBe('g-xyz');
    expect(d.asOf).toBe('NOW');
    expect(d.groupName).toBe('健澜医疗集团');
  });
});

describe('compareHospitals 跨院指标对比', () => {
  it('门诊量对比：排名降序、集团均值、偏离度', () => {
    const rows = compareHospitals('g1', 'outpatientVolume', '2026-10', baseMetrics());
    expect(rows).toHaveLength(3);
    expect(rows[0].rank).toBe(1);
    expect(rows[0].hospitalName).toBe('健澜总院'); // 90000 最高
    expect(rows[0].groupAverage).toBe(50000); // (90000+50000+10000)/3
    // (90000-50000)/50000*100 = 80
    expect(rows[0].deviationPct).toBe(80);
    expect(rows[0].isAboveAverage).toBe(true);
    // 最低的协作院排第 3
    expect(rows[2].rank).toBe(3);
    expect(rows[2].isAboveAverage).toBe(false);
  });

  it('满意度对比：均值 90、协作院 100 分排第一', () => {
    const rows = compareHospitals('g1', 'satisfaction', '2026-10', baseMetrics());
    expect(rows[0].hospitalName).toBe('临平协作院');
    expect(rows[0].value).toBe(100);
    expect(rows[0].groupAverage).toBe(90);
    // (100-90)/90*100 = 11.11
    expect(rows[0].deviationPct).toBe(11.11);
  });

  it('非法指标键返回空数组，不抛错', () => {
    const rows = compareHospitals('g1', 'notAMetric', '2026-10', baseMetrics());
    expect(rows).toEqual([]);
  });

  it('周期过滤：只对比指定周期的快照', () => {
    const metrics = baseMetrics();
    metrics.push({ ...metrics[0], hospitalId: 'h-old', hospitalName: '旧数据院', period: '2026-09', outpatientVolume: 1 });
    const rows = compareHospitals('g1', 'outpatientVolume', '2026-10', metrics);
    expect(rows).toHaveLength(3); // 不含 2026-09 的旧院
    expect(rows.every((r) => r.period === '2026-10')).toBe(true);
  });

  it('空快照返回空数组', () => {
    expect(compareHospitals('g1', 'outpatientVolume', '2026-10', [])).toEqual([]);
  });
});

describe('optimizeGroupResource 跨院资源优化', () => {
  it('专家资源：总院饱和(90) → 协作院闲置(40)，生成调配动作', () => {
    const s = optimizeGroupResource('g1', 'expert', baseMetrics(), 'NOW');
    expect(s.resourceName).toBe('专家');
    expect(s.averageLoad).toBe(60); // (90+50+40)/3
    expect(s.overloaded.map((o) => o.hospitalName)).toEqual(['健澜总院']);
    // 低负载院升序：40(协作院) 在前，50(分院) 在后
    expect(s.idle.map((o) => o.hospitalName)).toEqual(['临平协作院', '城东分院']);
    expect(s.actionItems).toHaveLength(1);
    const act = s.actionItems[0];
    expect(act.fromHospitalName).toBe('临平协作院');
    expect(act.toHospitalName).toBe('健澜总院');
    // gap = 90-60 = 30 → 30/10 = 3 人
    expect(act.estimatedQuantity).toBe(3);
  });

  it('床位资源：总院 95 饱和、分院 60 与协作院 50 均在闲置线', () => {
    const s = optimizeGroupResource('g1', 'bed', baseMetrics(), 'NOW');
    expect(s.overloaded.map((o) => o.hospitalName)).toEqual(['健澜总院']);
    expect(s.idle).toHaveLength(2); // 60 ≤ 60 且 50 ≤ 60
    expect(s.actionItems[0].toHospitalName).toBe('健澜总院');
  });

  it('设备资源：无饱和院（最高 80 < 85）→ 无调配动作', () => {
    const s = optimizeGroupResource('g1', 'equipment', baseMetrics(), 'NOW');
    expect(s.overloaded).toEqual([]);
    expect(s.actionItems).toEqual([]);
    expect(s.idle.map((o) => o.hospitalName)).toEqual(['临平协作院']); // 30 ≤ 60
  });

  it('负载全在均衡区间 → 建议「暂无需跨院调配」', () => {
    const balanced: HospitalMetricSnapshot[] = baseMetrics().map((m) => ({
      ...m,
      expertLoad: 70,
      equipmentLoad: 72,
      bedOccupancy: 68,
    }));
    const s = optimizeGroupResource('g1', 'expert', balanced, 'NOW');
    expect(s.overloaded).toEqual([]);
    expect(s.idle).toEqual([]);
    expect(s.actionItems).toEqual([]);
    expect(s.suggestions[0]).toContain('暂无需跨院调配');
  });

  it('空快照 → demo 标记、空结构', () => {
    const s = optimizeGroupResource('g1', 'expert', [], 'NOW');
    expect(s.demo).toBe(true);
    expect(s.overloaded).toEqual([]);
    expect(s.idle).toEqual([]);
  });

  it('未知资源类型 → 安全返回空建议，不抛错', () => {
    const s = optimizeGroupResource('g1', 'laser' as never, baseMetrics(), 'NOW');
    expect(s.demo).toBe(true);
    expect(s.actionItems).toEqual([]);
  });

  it('阈值常量与设计口径一致', () => {
    expect(OVERLOAD_THRESHOLD).toBe(85);
    expect(IDLE_THRESHOLD).toBe(60);
  });
});
