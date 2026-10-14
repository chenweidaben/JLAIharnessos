/**
 * 健澜科技 jlmedaios - 科主任 agent 驾驶舱纯函数单测
 *
 * 覆盖 computeDeptKpis：四项 KPI 计算、空样本降级为 null、bedCount=0 周转率降级、
 * ≥90 分甲级占比边界（90 分计入甲级）、小数位舍入。
 * 全部使用内存数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildWarnings,
  computeDeptKpis,
  pickDeptFeeSamples,
  summarizeInpatientVisits,
  type DeptKpiRow,
  type InpatientVisitLike,
} from '../../src/bff/aggregators/deptCockpitAggregator';

/** 与 aggregator 内 DEMO_ROW 同形的完整行 */
const fullRow: DeptKpiRow = {
  inHospitalCount: 42,
  dischargedToday: 6,
  bedCount: 50,
  losDays: [5.2, 4.8, 6.1, 7.3, 5.9, 4.5],
  fees: [8200, 7600, 9100, 6800, 10200, 7900],
  qcScores: [92, 88, 95, 78, 90, 96, 85, 91],
};

describe('computeDeptKpis 完整行计算', () => {
  it('床位周转率 = 当日出院 / 开放床位，保留 2 位', () => {
    const k = computeDeptKpis(fullRow);
    // 6 / 50 = 0.12
    expect(k.bedTurnoverRate).toBe(0.12);
  });

  it('平均住院日 = losDays 均值，保留 1 位', () => {
    const k = computeDeptKpis(fullRow);
    // (5.2+4.8+6.1+7.3+5.9+4.5)/6 = 5.6333 → 5.6
    expect(k.avgLod).toBe(5.6);
  });

  it('次均费用 = fees 均值，四舍五入到元', () => {
    const k = computeDeptKpis(fullRow);
    // 49800 / 6 = 8300
    expect(k.avgCost).toBe(8300);
  });

  it('甲级病历率 = ≥90 分占比，保留 2 位', () => {
    const k = computeDeptKpis(fullRow);
    // 8 个样本中 ≥90：92,95,90,96,91 共 5 个 → 0.625 → 0.63
    expect(k.gradeARate).toBe(0.63);
  });
});

describe('computeDeptKpis 空样本 / 异常降级', () => {
  it('全空行：除周转率外其余为 null（不臆造 0）', () => {
    const empty: DeptKpiRow = {
      inHospitalCount: 0, dischargedToday: 0, bedCount: 0,
      losDays: [], fees: [], qcScores: [],
    };
    const k = computeDeptKpis(empty);
    // bedCount=0 → 周转率 null
    expect(k.bedTurnoverRate).toBeNull();
    expect(k.avgLod).toBeNull();
    expect(k.avgCost).toBeNull();
    expect(k.gradeARate).toBeNull();
  });

  it('bedCount=0 即使有出院人数，周转率仍为 null（无床位来源不臆造）', () => {
    const k = computeDeptKpis({ ...fullRow, bedCount: 0, dischargedToday: 10 });
    expect(k.bedTurnoverRate).toBeNull();
    // 其余不受影响
    expect(k.avgLod).toBe(5.6);
  });

  it('qcScores 为空时甲级病历率为 null', () => {
    const k = computeDeptKpis({ ...fullRow, qcScores: [] });
    expect(k.gradeARate).toBeNull();
  });
});

describe('computeDeptKpis 甲级边界与舍入', () => {
  it('恰好 90 分计入甲级；89 不计入', () => {
    const k = computeDeptKpis({
      ...fullRow,
      qcScores: [90, 89, 90, 89],
    });
    // 2/4 = 0.5
    expect(k.gradeARate).toBe(0.5);
  });

  it('avgLod 均值四舍五入到 1 位', () => {
    const k = computeDeptKpis({ ...fullRow, losDays: [5.35, 5.35] });
    expect(k.avgLod).toBe(5.4); // 5.35 → 5.4
  });
});

describe('buildWarnings 红线推导', () => {
  it('甲级病历率低于 0.9 产出 error 预警', () => {
    const k = computeDeptKpis(fullRow); // gradeARate 0.63
    const ws = buildWarnings(k);
    expect(ws.some((w) => w.id === 'grade-a-rate-low' && w.severity === 'error')).toBe(true);
  });

  it('指标全部达标时产出 info 正常提示', () => {
    const k = computeDeptKpis({
      inHospitalCount: 10, dischargedToday: 2, bedCount: 20,
      losDays: [4, 5], fees: [5000, 6000], qcScores: [95, 92, 98],
    });
    expect(k.gradeARate).toBe(1);
    const ws = buildWarnings(k);
    expect(ws.some((w) => w.severity === 'info' && w.id === 'all-good')).toBe(true);
  });
});

describe('summarizeInpatientVisits 真实就诊汇总（纯函数）', () => {
  const today = '2026-10-14';
  const nowIso = '2026-10-14T08:00:00.000Z';

  it('在院 ongoing 计为在院，住院日=now-admit；缺 dischargeAt 用已住院天数', () => {
    const visits: InpatientVisitLike[] = [
      // 已在院 3 天
      { status: 'ongoing', admitAt: '2026-10-11T08:00:00.000Z', dischargeAt: null },
    ];
    const s = summarizeInpatientVisits(visits, today, nowIso);
    expect(s.inHospitalCount).toBe(1);
    expect(s.dischargedToday).toBe(0);
    expect(s.losDays.length).toBe(1);
    expect(s.losDays[0]).toBeCloseTo(3, 5);
  });

  it('当日出院计 dischargedToday，住院日=discharge-admit；隔日出院不计当日', () => {
    const visits: InpatientVisitLike[] = [
      // 今天出院：住院 4 天
      { status: 'discharged', admitAt: '2026-10-10T08:00:00.000Z', dischargeAt: '2026-10-14T08:00:00.000Z' },
      // 昨天出院：住院 4 天，但不计当日出院
      { status: 'discharged', admitAt: '2026-10-09T08:00:00.000Z', dischargeAt: '2026-10-13T08:00:00.000Z' },
    ];
    const s = summarizeInpatientVisits(visits, today, nowIso);
    expect(s.inHospitalCount).toBe(0);
    expect(s.dischargedToday).toBe(1);
    expect(s.losDays).toHaveLength(2);
    expect(s.losDays[0]).toBeCloseTo(4, 5);
    expect(s.losDays[1]).toBeCloseTo(4, 5);
  });

  it('transferred/cancelled 不计入在院、当日出院与住院日样本', () => {
    const visits: InpatientVisitLike[] = [
      { status: 'transferred', admitAt: '2026-10-12T08:00:00.000Z', dischargeAt: null },
      { status: 'cancelled', admitAt: '2026-10-12T08:00:00.000Z', dischargeAt: null },
    ];
    const s = summarizeInpatientVisits(visits, today, nowIso);
    expect(s.inHospitalCount).toBe(0);
    expect(s.dischargedToday).toBe(0);
    expect(s.losDays).toHaveLength(0);
  });

  it('缺 admitAt 的就诊不产出非法住院日（不臆造）', () => {
    const visits: InpatientVisitLike[] = [
      { status: 'ongoing', admitAt: null, dischargeAt: null },
    ];
    const s = summarizeInpatientVisits(visits, today, nowIso);
    expect(s.inHospitalCount).toBe(1);
    expect(s.losDays).toHaveLength(0);
  });
});

describe('pickDeptFeeSamples DRG/DIP 结算费用筛选（纯函数）', () => {
  it('只取本科室、可解析、非负的费用样本', () => {
    const fees = pickDeptFeeSamples([
      { department: '内科', totalFee: '8200.5' },
      { department: '内科', totalFee: null },
      { department: '外科', totalFee: '9000' }, // 非本科室
      { department: '内科', totalFee: -100 },   // 非法负值
      { department: '内科', totalFee: 5000 },  // 数值型
    ], '内科');
    expect(fees).toEqual([8200.5, 5000]);
  });

  it('空行或无本科室行返回空数组（次均费用降级 null，不臆造）', () => {
    expect(pickDeptFeeSamples([], '内科')).toEqual([]);
    expect(pickDeptFeeSamples([{ department: '外科', totalFee: '1' }], '内科')).toEqual([]);
  });
});
