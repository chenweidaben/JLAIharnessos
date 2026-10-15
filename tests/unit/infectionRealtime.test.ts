/**
 * 健澜科技 jlmedaios - 院感实时监测纯函数单测（M153-C）
 *
 * 覆盖：
 *  - 感染率计算：SSI（%）/ CLABSI（‰）/ VAP（‰）/ MDRO（%）口径，分母为 0 记 0；
 *  - 暴发识别：超阈值即 outbreak+redAlert（不等月报）、等于阈值 orange、低于阈值 yellow；
 *  - 预警生成：暴发红色预警结构化输出（标题/文案/处置动作/redAlert）。
 * 纯函数、无 I/O、无 DB、无 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  detectOutbreak,
  generateInfectionAlert,
  monitorInfectionRates,
  type DeptInfectionInput,
} from '../../src/bff/aggregators/infectionRealtimeAggregator.js';

const DEPT: DeptInfectionInput = {
  deptCode: 'D-TEST',
  deptName: '测试科室',
  surgeryCount: 80,
  ssiCases: 5,
  centralLineDays: 120,
  clabsiCases: 3,
  ventDays: 200,
  vapCases: 4,
  totalCultures: 60,
  mdroDetections: 4,
};

describe('M153-C 感染率计算（monitorInfectionRates）', () => {
  it('SSI 率 = 例数/手术台数 ×100%（5/80 = 6.25%）', () => {
    const r = monitorInfectionRates(DEPT, '2026-10-16');
    expect(r.ssiRate).toBe(6.25);
  });

  it('CLABSI 率 = 例数/导管留置日 ×1000‰（3/120 = 25‰）', () => {
    const r = monitorInfectionRates(DEPT, '2026-10-16');
    expect(r.clabsiRate).toBe(25);
  });

  it('VAP 率 = 例数/通气日 ×1000‰（4/200 = 20‰）', () => {
    const r = monitorInfectionRates(DEPT, '2026-10-16');
    expect(r.vapRate).toBe(20);
  });

  it('MDRO 检出率 = 检出株数/培养标本数 ×100%（4/60 ≈ 6.67%）', () => {
    const r = monitorInfectionRates(DEPT, '2026-10-16');
    expect(r.mdroRate).toBe(6.67);
  });

  it('分母为 0 时各率记 0，不抛除零错误', () => {
    const empty: DeptInfectionInput = {
      deptCode: 'D-EMPTY',
      deptName: '空科室',
      surgeryCount: 0,
      ssiCases: 1,
      centralLineDays: 0,
      clabsiCases: 1,
      ventDays: 0,
      vapCases: 1,
      totalCultures: 0,
      mdroDetections: 1,
    };
    const r = monitorInfectionRates(empty, '2026-10-16');
    expect(r.ssiRate).toBe(0);
    expect(r.clabsiRate).toBe(0);
    expect(r.vapRate).toBe(0);
    expect(r.mdroRate).toBe(0);
  });

  it('保留入参科室与周期', () => {
    const r = monitorInfectionRates(DEPT, '2026-W42');
    expect(r.deptCode).toBe('D-TEST');
    expect(r.deptName).toBe('测试科室');
    expect(r.period).toBe('2026-W42');
  });
});

describe('M153-C 暴发识别（detectOutbreak，超阈值即触发，不等月报）', () => {
  it('cases > threshold → outbreak=true 且 redAlert=true（红色暴发）', () => {
    const r = detectOutbreak(DEPT, 'ssi', 5, 3);
    expect(r.outbreak).toBe(true);
    expect(r.redAlert).toBe(true);
    expect(r.level).toBe('red');
    expect(r.exceedRatio).toBe(1.67);
    expect(r.message).toContain('超过暴发阈值');
  });

  it('cases === threshold → orange（达到阈值，不标红）', () => {
    const r = detectOutbreak(DEPT, 'clabsi', 2, 2);
    expect(r.outbreak).toBe(false);
    expect(r.redAlert).toBe(false);
    expect(r.level).toBe('orange');
  });

  it('cases < threshold → yellow（持续监测）', () => {
    const r = detectOutbreak(DEPT, 'vap', 1, 2);
    expect(r.outbreak).toBe(false);
    expect(r.redAlert).toBe(false);
    expect(r.level).toBe('yellow');
  });

  it('threshold=0 时 exceedRatio 记 0，不抛错', () => {
    const r = detectOutbreak(DEPT, 'mdro', 1, 0);
    expect(r.exceedRatio).toBe(0);
    expect(r.outbreak).toBe(true);
  });
});

describe('M153-C 预警生成（generateInfectionAlert）', () => {
  it('暴发时生成 redAlert=true 红色预警，含处置动作', () => {
    const a = generateInfectionAlert({
      deptCode: 'D-SURG',
      deptName: '普外科',
      infectionType: 'ssi',
      period: '2026-10-16',
      cases: 5,
      threshold: 3,
      rateValue: 6.25,
      rateUnit: '%',
    });
    expect(a.redAlert).toBe(true);
    expect(a.level).toBe('red');
    expect(a.title).toContain('红色暴发预警');
    expect(a.message).toContain('普外科');
    expect(a.actions.length).toBeGreaterThanOrEqual(3);
    expect(a.alertNo).toContain('IR-D-SURG-ssi-2026-10-16');
  });

  it('未超阈值时 redAlert=false，level=yellow', () => {
    const a = generateInfectionAlert({
      deptCode: 'D-GEN',
      deptName: '普通内科',
      infectionType: 'mdro',
      period: '2026-10-16',
      cases: 1,
      threshold: 5,
      rateValue: 2.2,
      rateUnit: '%',
    });
    expect(a.redAlert).toBe(false);
    expect(a.level).toBe('yellow');
    expect(a.actions.length).toBeLessThan(3);
  });
});
