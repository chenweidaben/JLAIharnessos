/**
 * 健澜科技 jlmedaios - 药师 MUSE 个人审方经验聚合纯函数单测（依据宪法第七章 7.6）
 *
 * 不依赖数据库/BFF：直接测 buildPharmaMuse 纯函数。
 *   1) 空输入 -> 结构完整的零值结果；
 *   2) 审方经验聚合：totalAudits 计数、topDrugPairs 按药物组合归并；
 *   3) 拦截统计：blockedUnreasonable 只统计 blocked=true 的记录；
 *   4) 采纳率：adopted / 有结局干预（pending 不计入分母），无干预为 0；
 *   5) 药物组合排序：命中次数降序 -> 拦截次数降序 -> 字典序，并截 Top10；
 *   6) 学习曲线：按自然日分桶，period 升序输出每日审方/拦截/采纳率。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildPharmaMuse,
  type PharmaAuditRecord,
  type PharmaIntervention,
} from '../../src/bff/aggregators/pharmaMuseAggregator';

const audit = (
  drugPair: string,
  issueType: string,
  blocked: boolean,
  createdAt: string,
): PharmaAuditRecord => ({ drugPair, issueType, blocked, createdAt });

const interv = (
  drugPair: string,
  intervention: string,
  outcome: string,
  createdAt: string,
): PharmaIntervention => ({ drugPair, intervention, outcome, createdAt });

describe('buildPharmaMuse', () => {
  it('空输入 -> 结构完整的零值结果，不抛错', () => {
    const view = buildPharmaMuse('ph-001', [], []);
    expect(view.totalAudits).toBe(0);
    expect(view.blockedUnreasonable).toBe(0);
    expect(view.adoptionRate).toBe(0);
    expect(view.topDrugPairs).toEqual([]);
    expect(view.accuracyTrend).toEqual([]);
  });

  it('审方经验聚合：totalAudits 计数、topDrugPairs 按药物组合归并', () => {
    const view = buildPharmaMuse('ph-001', [
      audit('华法林||阿司匹林', 'ddi', true, '2026-10-15T09:00:00+08:00'),
      audit('华法林||阿司匹林', 'ddi', false, '2026-10-15T11:00:00+08:00'),
      audit('二甲双胍||造影剂', 'contraindication', true, '2026-10-14T10:00:00+08:00'),
    ], []);
    expect(view.totalAudits).toBe(3);
    expect(view.topDrugPairs).toHaveLength(2);
    const warfarin = view.topDrugPairs.find((p) => p.drugPair === '华法林||阿司匹林')!;
    expect(warfarin.audits).toBe(2);
    expect(warfarin.blocked).toBe(1);
    expect(warfarin.blockedRate).toBe(0.5);
    expect(warfarin.issueType).toBe('ddi');
  });

  it('拦截统计：blockedUnreasonable 只统计 blocked=true 的记录', () => {
    const view = buildPharmaMuse('ph-001', [
      audit('A||B', 'ddi', true, '2026-10-15T09:00:00+08:00'),
      audit('C||D', 'dose', false, '2026-10-15T10:00:00+08:00'),
      audit('E||F', 'duplicate', true, '2026-10-15T11:00:00+08:00'),
      audit('G||H', 'ddi', false, '2026-10-15T12:00:00+08:00'),
    ], []);
    expect(view.totalAudits).toBe(4);
    expect(view.blockedUnreasonable).toBe(2);
  });

  it('采纳率：adopted / 有结局干预，pending 不计入分母；无干预为 0', () => {
    const none = buildPharmaMuse('ph-001', [], []);
    expect(none.adoptionRate).toBe(0);

    const view = buildPharmaMuse(
      'ph-001',
      [],
      [
        interv('A||B', '建议换药', 'adopted', '2026-10-15T09:00:00+08:00'),
        interv('C||D', '建议减量', 'rejected', '2026-10-15T10:00:00+08:00'),
        interv('E||F', '建议暂停', 'adopted', '2026-10-15T11:00:00+08:00'),
        interv('G||H', '建议复核', 'pending', '2026-10-15T12:00:00+08:00'),
      ],
    );
    // adopted=2 / decided=3（adopted+rejected）= 0.6667
    expect(view.adoptionRate).toBe(0.6667);
  });

  it('药物组合排序：命中次数降序 -> 拦截次数降序 -> 字典序，截 Top10', () => {
    const records: PharmaAuditRecord[] = [
      // 命中 1
      audit('X||Y', 'ddi', true, '2026-10-15T09:00:00+08:00'),
      // 命中 3，拦截 1
      audit('A||B', 'ddi', true, '2026-10-15T09:00:00+08:00'),
      audit('A||B', 'ddi', false, '2026-10-15T10:00:00+08:00'),
      audit('A||B', 'ddi', false, '2026-10-15T11:00:00+08:00'),
      // 命中 3，拦截 2（同次数时拦截多者靠前）
      audit('M||N', 'contraindication', true, '2026-10-15T09:00:00+08:00'),
      audit('M||N', 'contraindication', true, '2026-10-15T10:00:00+08:00'),
      audit('M||N', 'contraindication', false, '2026-10-15T11:00:00+08:00'),
    ];
    // 补 11 个组合，验证 Top10 截断
    for (let i = 0; i < 11; i += 1) {
      records.push(audit(`Z${i}||Z`, 'ddi', false, '2026-10-15T09:00:00+08:00'));
    }
    const view = buildPharmaMuse('ph-001', records, []);
    expect(view.topDrugPairs).toHaveLength(10);
    expect(view.topDrugPairs[0].drugPair).toBe('M||N');
    expect(view.topDrugPairs[1].drugPair).toBe('A||B');
    expect(view.topDrugPairs[2].drugPair).toBe('X||Y');
  });

  it('学习曲线：按自然日分桶，period 升序，每日采纳率独立计算', () => {
    const view = buildPharmaMuse(
      'ph-001',
      [
        audit('A||B', 'ddi', true, '2026-10-13T09:00:00+08:00'),
        audit('C||D', 'dose', false, '2026-10-14T10:00:00+08:00'),
        audit('E||F', 'ddi', true, '2026-10-15T11:00:00+08:00'),
        audit('G||H', 'duplicate', true, '2026-10-15T14:00:00+08:00'),
      ],
      [
        interv('A||B', '建议换药', 'adopted', '2026-10-13T09:00:00+08:00'),
        interv('C||D', '建议减量', 'rejected', '2026-10-14T10:00:00+08:00'),
        interv('E||F', '建议暂停', 'adopted', '2026-10-15T11:00:00+08:00'),
        interv('G||H', '建议复核', 'adopted', '2026-10-15T14:00:00+08:00'),
      ],
    );
    expect(view.accuracyTrend.map((p) => p.period)).toEqual(['2026-10-13', '2026-10-14', '2026-10-15']);
    const d13 = view.accuracyTrend[0];
    expect(d13.audits).toBe(1);
    expect(d13.blocked).toBe(1);
    expect(d13.adoptionRate).toBe(1);
    const d14 = view.accuracyTrend[1];
    expect(d14.blocked).toBe(0);
    expect(d14.adoptionRate).toBe(0);
    const d15 = view.accuracyTrend[2];
    expect(d15.audits).toBe(2);
    expect(d15.adoptionRate).toBe(1);
  });
});
