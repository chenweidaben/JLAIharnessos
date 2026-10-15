/**
 * 健澜科技 jlmedaios - M147-C 国考指标纯函数单测
 *
 * 覆盖：
 *   - calculateHospitalKPI：20 项 C1..C20 全量输出、period 透传、观测值注入覆盖、
 *     缺省回退 demoActual、不修改入参；
 *   - compareKPIWithTarget：higher/lower 两方向的绿/黄/红三色边界判定、
 *     lower 方向 actual=0 完美兜底、未登记编码抛错；
 *   - summarizeKpi：三色计数与达标率；
 *   - compareKpiTrend：跨期趋势，方向归一后判断向好/向差。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  KPI_CATALOG,
  calculateHospitalKPI,
  compareKPIWithTarget,
  compareKpiTrend,
  summarizeKpi,
} from '../../src/bff/aggregators/hospitalKpiAggregator';

describe('calculateHospitalKPI 指标计算', () => {
  it('输出完整 20 项，编码按 C1..C20 顺序', () => {
    const rows = calculateHospitalKPI('2026');
    expect(rows).toHaveLength(20);
    expect(rows[0].code).toBe('C1');
    expect(rows[19].code).toBe('C20');
    // 与目录一一对应
    expect(rows.map((r) => r.code)).toEqual(KPI_CATALOG.map((k) => k.code));
  });

  it('period 透传到每条结果', () => {
    const rows = calculateHospitalKPI('2026-Q3');
    expect(rows.every((r) => r.period === '2026-Q3')).toBe(true);
  });

  it('空 period 回退 current，不抛错', () => {
    const rows = calculateHospitalKPI('');
    expect(rows[0].period).toBe('current');
  });

  it('注入观测值覆盖 demoActual', () => {
    const rows = calculateHospitalKPI('2026', { C2: 20 });
    const c2 = rows.find((r) => r.code === 'C2')!;
    expect(c2.actual).toBe(20);
    // higher 方向：20/18=1.11 达标绿
    expect(c2.status).toBe('green');
    expect(c2.statusLabel).toBe('达标');
  });

  it('缺失观测回退目录 demoActual（不冒充真实样本）', () => {
    const rows = calculateHospitalKPI('2026', {});
    const c1 = rows.find((r) => r.code === 'C1')!;
    expect(c1.actual).toBe(3.5);
  });

  it('不修改入参对象', () => {
    const obs = { C1: 4.0 } as Record<string, number>;
    const snapshot = { ...obs };
    calculateHospitalKPI('2026', obs);
    expect(obs).toEqual(snapshot);
  });
});

describe('compareKPIWithTarget 达标三色判定', () => {
  it('higher 方向：actual>=target 绿', () => {
    const r = compareKPIWithTarget('C1', 3.2);
    expect(r.achievementRate).toBeCloseTo(1.0, 3);
    expect(r.status).toBe('green');
  });

  it('higher 方向：达成率恰好 0.9 为待改进黄（边界）', () => {
    // C2 target=18, 16.2/18=0.9
    const r = compareKPIWithTarget('C2', 16.2);
    expect(r.achievementRate).toBeCloseTo(0.9, 3);
    expect(r.status).toBe('yellow');
    expect(r.statusLabel).toBe('待改进');
  });

  it('higher 方向：达成率 < 0.9 为未达标红', () => {
    // C15 target=50, 30/50=0.6
    const r = compareKPIWithTarget('C15', 30);
    expect(r.status).toBe('red');
    expect(r.statusLabel).toBe('未达标');
  });

  it('lower 方向：actual<=target 绿', () => {
    // C7 target=8.0, 实际 7.6 -> 8/7.6=1.053
    const r = compareKPIWithTarget('C7', 7.6);
    expect(r.status).toBe('green');
  });

  it('lower 方向：略超目标但在 10% 内为黄', () => {
    // C7 target=8.0, 8.5 -> 8/8.5=0.941
    const r = compareKPIWithTarget('C7', 8.5);
    expect(r.status).toBe('yellow');
  });

  it('lower 方向：超标超过 10% 为红', () => {
    // C10 target=5, 6.1 -> 5/6.1=0.82
    const r = compareKPIWithTarget('C10', 6.1);
    expect(r.status).toBe('red');
  });

  it('lower 方向：actual=0 视为完美绿（除零兜底）', () => {
    // C3 target=0.2, 0 死亡率
    const r = compareKPIWithTarget('C3', 0);
    expect(r.status).toBe('green');
  });

  it('未登记编码抛错（防止脏数据静默通过）', () => {
    expect(() => compareKPIWithTarget('C99', 1)).toThrow(/未登记/);
  });

  it('结论话术包含指标名与实际/目标值', () => {
    const r = compareKPIWithTarget('C2', 16.2);
    expect(r.conclusion).toContain('出院患者四级手术比例');
    expect(r.conclusion).toContain('方向修正后可达标');
  });
});

describe('summarizeKpi 三色汇总', () => {
  it('按受控观测统计绿/黄/红计数与达标率', () => {
    const rows = calculateHospitalKPI('2026', {
      C1: 4.0, // 绿
      C2: 17.0, // 17/18=0.944 黄
      C10: 7.0, // 5/7=0.714 红
    });
    const s = summarizeKpi(rows);
    expect(s.total).toBe(20);
    expect(s.green).toBe(10);
    expect(s.yellow).toBe(7);
    expect(s.red).toBe(3);
    expect(s.passRate).toBe(50);
    expect(s.byDimension).toHaveLength(4);
  });
});

describe('compareKpiTrend 趋势对比', () => {
  it('higher 方向：数值上升判定向好', () => {
    const prev = calculateHospitalKPI('2025', { C1: 3.3 });
    const curr = calculateHospitalKPI('2026', { C1: 3.5 });
    const trend = compareKpiTrend(prev, curr);
    const c1 = trend.find((t) => t.code === 'C1')!;
    expect(c1.delta).toBeCloseTo(0.2, 2);
    expect(c1.improving).toBe(true);
  });

  it('lower 方向：数值下降判定向好（方向已归一）', () => {
    // C7 平均住院日：上一期 8.2 -> 本期 7.6，下降向好
    const prev = calculateHospitalKPI('2025', { C7: 8.2 });
    const curr = calculateHospitalKPI('2026', { C7: 7.6 });
    const trend = compareKpiTrend(prev, curr);
    const c7 = trend.find((t) => t.code === 'C7')!;
    expect(c7.delta).toBeCloseTo(-0.6, 2);
    expect(c7.improving).toBe(true);
  });

  it('higher 方向：数值下降判定向差', () => {
    const prev = calculateHospitalKPI('2025', { C15: 30 });
    const curr = calculateHospitalKPI('2026', { C15: 20 });
    const trend = compareKpiTrend(prev, curr);
    const c15 = trend.find((t) => t.code === 'C15')!;
    expect(c15.improving).toBe(false);
  });
});
