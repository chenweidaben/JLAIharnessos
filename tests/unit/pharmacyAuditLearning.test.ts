/**
 * 健澜科技 jlmedaios - 药师审方「越审越准」拦截模式纯函数单测（依据宪法第四章）
 *
 * 不依赖数据库/BFF：直接测 buildPharmacyAuditPattern 与 rankHighRisk 纯函数。
 *   1) 空输入 -> 空模式列表；
 *   2) 模式提取：按 (drugCode, interactionType) 归并分组；
 *   3) 频次统计：frequency 计数、avgRiskLevel 均值、lastOccurred 取最新；
 *   4) 频次排序：frequency 高的模式排前面；
 *   5) 高频预警：低于阈值的组合被过滤、命中阈值的组合高亮；
 *   6) 风险分级：按 avgRiskLevel 输出 critical/high/medium 档位。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildPharmacyAuditPattern,
  rankHighRisk,
  type PharmacyAuditRecord,
} from '../../src/bff/aggregators/pharmacyAuditLearningAggregator';

const rec = (
  drugCode: string,
  interactionType: string,
  riskLevel: number,
  occurredAt: string,
): PharmacyAuditRecord => ({ drugCode, interactionType, riskLevel, occurredAt });

describe('buildPharmacyAuditPattern', () => {
  it('空输入 -> 空模式列表', () => {
    expect(buildPharmacyAuditPattern([])).toEqual([]);
  });

  it('模式提取：按 (drugCode, interactionType) 归并分组，同组合并、异组拆分', () => {
    const patterns = buildPharmacyAuditPattern([
      rec('C01AA05', 'ddi', 4, '2026-10-13T09:10:00+08:00'),
      rec('C01AA05', 'ddi', 5, '2026-10-11T14:20:00+08:00'),
      rec('N02BE01', 'duplicate', 2, '2026-10-12T16:40:00+08:00'),
    ]);
    expect(patterns).toHaveLength(2);
    const ddi = patterns.find((p) => p.drugCode === 'C01AA05')!;
    expect(ddi.interactionType).toBe('ddi');
    expect(ddi.frequency).toBe(2);
  });

  it('频次统计：frequency 计数正确、avgRiskLevel 取均值、lastOccurred 取最新', () => {
    const patterns = buildPharmacyAuditPattern([
      rec('C01AA05', 'ddi', 4, '2026-10-09T08:05:00+08:00'),
      rec('C01AA05', 'ddi', 4, '2026-10-11T14:20:00+08:00'),
      rec('C01AA05', 'ddi', 5, '2026-10-13T09:10:00+08:00'),
    ]);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].frequency).toBe(3);
    // (4+4+5)/3 = 4.333... -> 4.33
    expect(patterns[0].avgRiskLevel).toBe(4.33);
    expect(patterns[0].lastOccurred).toBe('2026-10-13T09:10:00+08:00');
  });

  it('输出按 frequency 降序排列（频次排序）', () => {
    const patterns = buildPharmacyAuditPattern([
      rec('J01DD04', 'contraindication', 5, '2026-10-14T10:30:00+08:00'),
      rec('C01AA05', 'ddi', 4, '2026-10-13T09:10:00+08:00'),
      rec('C01AA05', 'ddi', 5, '2026-10-11T14:20:00+08:00'),
    ]);
    expect(patterns[0].drugCode).toBe('C01AA05');
    expect(patterns[0].frequency).toBe(2);
  });
});

describe('rankHighRisk', () => {
  it('空模式输入 -> 空列表，不抛错', () => {
    expect(rankHighRisk([])).toEqual([]);
  });

  it('高频预警：低于阈值的组合被过滤，命中阈值的组合高亮', () => {
    const patterns = buildPharmacyAuditPattern([
      // 高频：3 次 ddi
      rec('C01AA05', 'ddi', 4, '2026-10-13T09:10:00+08:00'),
      rec('C01AA05', 'ddi', 5, '2026-10-11T14:20:00+08:00'),
      rec('C01AA05', 'ddi', 4, '2026-10-09T08:05:00+08:00'),
      // 低频：仅 1 次禁忌
      rec('J01DD04', 'contraindication', 5, '2026-10-14T10:30:00+08:00'),
    ]);
    const sorted = rankHighRisk(patterns, 3);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].drugCode).toBe('C01AA05');
    expect(sorted[0].highlighted).toBe(true);
  });

  it('按 riskScore = frequency × avgRiskLevel 降序排序', () => {
    const patterns = buildPharmacyAuditPattern([
      // 3 次 × 2 分 = 6
      rec('N02BE01', 'duplicate', 2, '2026-10-12T16:40:00+08:00'),
      rec('N02BE01', 'duplicate', 2, '2026-10-10T11:00:00+08:00'),
      rec('N02BE01', 'duplicate', 2, '2026-10-08T09:00:00+08:00'),
      // 3 次 × 4 分 = 12
      rec('C01AA05', 'ddi', 4, '2026-10-13T09:10:00+08:00'),
      rec('C01AA05', 'ddi', 4, '2026-10-11T14:20:00+08:00'),
      rec('C01AA05', 'ddi', 4, '2026-10-09T08:05:00+08:00'),
    ]);
    const sorted = rankHighRisk(patterns, 3);
    expect(sorted).toHaveLength(2);
    expect(sorted[0].drugCode).toBe('C01AA05');
    expect(sorted[0].riskScore).toBe(12);
    expect(sorted[0].riskScore).toBeGreaterThan(sorted[1].riskScore);
  });

  it('风险分级：按 avgRiskLevel 输出 critical / high / medium 档位', () => {
    const patterns = buildPharmacyAuditPattern([
      // avg = 5 -> critical
      rec('J01DD04', 'contraindication', 5, '2026-10-14T10:30:00+08:00'),
      rec('J01DD04', 'contraindication', 5, '2026-10-13T10:30:00+08:00'),
      rec('J01DD04', 'contraindication', 5, '2026-10-12T10:30:00+08:00'),
      // avg = 3 -> high
      rec('N02BE01', 'duplicate', 3, '2026-10-12T16:40:00+08:00'),
      rec('N02BE01', 'duplicate', 3, '2026-10-11T16:40:00+08:00'),
      rec('N02BE01', 'duplicate', 3, '2026-10-10T16:40:00+08:00'),
      // avg = 1 -> medium
      rec('A01AA01', 'dose_reminder', 1, '2026-10-12T08:00:00+08:00'),
      rec('A01AA01', 'dose_reminder', 1, '2026-10-11T08:00:00+08:00'),
      rec('A01AA01', 'dose_reminder', 1, '2026-10-10T08:00:00+08:00'),
    ]);
    const sorted = rankHighRisk(patterns, 3);
    const byCode = Object.fromEntries(sorted.map((p) => [p.drugCode, p.riskTier]));
    expect(byCode['J01DD04']).toBe('critical');
    expect(byCode['N02BE01']).toBe('high');
    expect(byCode['A01AA01']).toBe('medium');
  });
});
