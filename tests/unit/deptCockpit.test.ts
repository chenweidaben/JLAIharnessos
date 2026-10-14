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
  type DeptKpiRow,
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
