/**
 * 健澜科技 jlmedaios - 护理工作台「越用越准」风险模式纯函数单测（依据宪法第四章）
 *
 * 不依赖数据库/BFF：直接测 buildNursingRiskPattern 与 prioritizeRisks 纯函数。
 *   1) 空输入 -> 空模式列表；
 *   2) 风险模式提取：按 (riskType, patientProfile) 归并分组；
 *   3) 频次统计：occurrenceCount 计数、avgSeverity 均值、lastOccurred 取最新；
 *   4) 优先级排序：频次高/严重度高的模式排前面；
 *   5) 近因衰减：陈旧模式得分衰减、排序后移；
 *   6) 在院画像命中：命中当前同画像患者的模式上浮排前。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildNursingRiskPattern,
  prioritizeRisks,
  type NursingRiskRecord,
  type CurrentPatient,
} from '../../src/bff/aggregators/nursingRiskPatternAggregator';

const rec = (
  riskType: string,
  patientProfile: string,
  severity: number,
  occurredAt: string,
): NursingRiskRecord => ({ wardId: 'W01', riskType, patientProfile, severity, occurredAt });

describe('buildNursingRiskPattern', () => {
  it('空输入 -> 空模式列表', () => {
    expect(buildNursingRiskPattern([])).toEqual([]);
  });

  it('按 (riskType, patientProfile) 归并分组：同组合并、异组拆分', () => {
    const patterns = buildNursingRiskPattern([
      rec('fall', '≥75岁卧床', 3, '2026-10-12T08:00:00+08:00'),
      rec('fall', '≥75岁卧床', 4, '2026-10-10T22:30:00+08:00'),
      rec('pressure_ulcer', '术后48h', 2, '2026-10-13T10:00:00+08:00'),
    ]);
    expect(patterns).toHaveLength(2);
    const fall = patterns.find((p) => p.riskType === 'fall')!;
    expect(fall.patientProfile).toBe('≥75岁卧床');
    expect(fall.occurrenceCount).toBe(2);
  });

  it('频次统计：occurrenceCount 计数正确、avgSeverity 取均值、lastOccurred 取最新', () => {
    const patterns = buildNursingRiskPattern([
      rec('fall', '≥75岁卧床', 3, '2026-10-08T06:10:00+08:00'),
      rec('fall', '≥75岁卧床', 3, '2026-10-10T22:30:00+08:00'),
      rec('fall', '≥75岁卧床', 5, '2026-10-12T08:00:00+08:00'),
    ]);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].occurrenceCount).toBe(3);
    // (3+3+5)/3 = 3.666... -> 3.67
    expect(patterns[0].avgSeverity).toBe(3.67);
    expect(patterns[0].lastOccurred).toBe('2026-10-12T08:00:00+08:00');
  });

  it('输出按 occurrenceCount 降序排列', () => {
    const patterns = buildNursingRiskPattern([
      rec('tube_dislodgement', '夜间22:00-06:00', 2, '2026-10-01T03:00:00+08:00'),
      rec('fall', '≥75岁卧床', 3, '2026-10-12T08:00:00+08:00'),
      rec('fall', '≥75岁卧床', 4, '2026-10-10T22:30:00+08:00'),
    ]);
    expect(patterns[0].riskType).toBe('fall');
    expect(patterns[0].occurrenceCount).toBe(2);
  });
});

describe('prioritizeRisks', () => {
  const NOW = '2026-10-15T00:00:00+08:00';

  it('空模式/空患者输入 -> 空列表，不抛错', () => {
    expect(prioritizeRisks([], [], NOW)).toEqual([]);
  });

  it('频次高 × 严重度高的模式排前面（无在院患者时按 base 分排序）', () => {
    const patterns = buildNursingRiskPattern([
      // 低频但极严重：1 次 × 5 分 = 5
      rec('fall', '术后谵妄', 5, '2026-10-14T08:00:00+08:00'),
      // 高频但温和：3 次 × 2 分 = 6
      rec('pressure_ulcer', '术后48h', 2, '2026-10-13T10:00:00+08:00'),
      rec('pressure_ulcer', '术后48h', 2, '2026-10-12T10:00:00+08:00'),
      rec('pressure_ulcer', '术后48h', 2, '2026-10-11T10:00:00+08:00'),
    ]);
    const sorted = prioritizeRisks(patterns, [], NOW);
    expect(sorted).toHaveLength(2);
    // 6 > 5 -> pressure_ulcer 排前
    expect(sorted[0].riskType).toBe('pressure_ulcer');
    expect(sorted[0].priorityScore).toBeGreaterThan(sorted[1].priorityScore);
  });

  it('近因衰减：陈旧模式得分衰减、排序后移', () => {
    const fresh = buildNursingRiskPattern([
      rec('fall', '≥75岁卧床', 3, '2026-10-14T08:00:00+08:00'),
    ]);
    const stale = buildNursingRiskPattern([
      rec('tube_dislodgement', '夜间22:00-06:00', 3, '2026-06-01T03:00:00+08:00'),
    ]);
    const sorted = prioritizeRisks([...fresh, ...stale], [], NOW);
    // 两者 base 分相同（1×3），但陈旧模式近因因子小 -> 新鲜模式排前
    expect(sorted[0].patientProfile).toBe('≥75岁卧床');
    expect(sorted[0].priorityScore).toBeGreaterThan(sorted[1].priorityScore);
  });

  it('在院画像命中：命中同画像患者的模式上浮排前，并标注 matchedVisits', () => {
    const patterns = buildNursingRiskPattern([
      rec('fall', '≥75岁卧床', 3, '2026-10-12T08:00:00+08:00'),
      rec('pressure_ulcer', '术后48h', 4, '2026-10-12T10:00:00+08:00'),
    ]);
    const current: CurrentPatient[] = [
      { visitId: 'V-1001', patientProfile: '≥75岁卧床', riskType: 'fall' },
    ];
    const sorted = prioritizeRisks(patterns, current, NOW);
    // pressure_ulcer base 分 = 1×4 = 4；fall base 分 = 1×3 = 3，命中上浮 1.5 -> 4.5 > 4
    expect(sorted[0].patientProfile).toBe('≥75岁卧床');
    expect(sorted[0].matchedCurrent).toBe(true);
    expect(sorted[0].matchedVisits).toEqual(['V-1001']);
    expect(sorted[1].matchedCurrent).toBe(false);
    expect(sorted[1].matchedVisits).toEqual([]);
  });

  it('画像命中需同 riskType（患者未指定风险类型时不做类型校验）', () => {
    const patterns = buildNursingRiskPattern([
      rec('fall', '≥75岁卧床', 3, '2026-10-12T08:00:00+08:00'),
    ]);
    // 患者画像相同但 riskType 不同 -> 不命中
    const sorted = prioritizeRisks(patterns, [
      { visitId: 'V-2001', patientProfile: '≥75岁卧床', riskType: 'pressure_ulcer' },
    ], NOW);
    expect(sorted[0].matchedCurrent).toBe(false);

    // 患者未指定 riskType -> 按画像命中
    const sorted2 = prioritizeRisks(patterns, [
      { visitId: 'V-2002', patientProfile: '≥75岁卧床' },
    ], NOW);
    expect(sorted2[0].matchedCurrent).toBe(true);
    expect(sorted2[0].matchedVisits).toEqual(['V-2002']);
  });
});
