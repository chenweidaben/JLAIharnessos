/**
 * 健澜科技 jlmedaios - MEDMUSE Phase 3 纯函数单测（209-medmuse-phase3.sql）
 *
 * 不依赖数据库：直接测 toolRegistry 导出的纯函数——
 *   1) 药师审方参数校验（normalizeReviewPrescriptionArgs）
 *   2) 医保 DRG/DIP 超支按病组聚合（summarizeOverspendByGroup）
 *   3) 患者端随访列表排序（sortFollowupsByDue）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  normalizeReviewPrescriptionArgs,
  summarizeOverspendByGroup,
  sortFollowupsByDue,
} from '../../src/bff/agents/toolRegistry';

describe('normalizeReviewPrescriptionArgs（药师审方参数校验）', () => {
  it('approve：规范化为 approved，缺省审方意见给默认话术', () => {
    const r = normalizeReviewPrescriptionArgs({ prescriptionId: 'rx-1', decision: 'approve' });
    expect(r.prescriptionId).toBe('rx-1');
    expect(r.decision).toBe('approved');
    expect(r.opinion.length).toBeGreaterThan(0);
  });

  it('reject：带意见时保留意见文本', () => {
    const r = normalizeReviewPrescriptionArgs({
      prescriptionId: 'rx-2',
      decision: 'reject',
      opinion: '配伍禁忌，建议停药',
    });
    expect(r.decision).toBe('rejected');
    expect(r.opinion).toBe('配伍禁忌，建议停药');
  });

  it('reject：兼容 comment 入参', () => {
    const r = normalizeReviewPrescriptionArgs({
      prescriptionId: 'rx-3',
      decision: 'reject',
      comment: '剂量超限',
    });
    expect(r.decision).toBe('rejected');
    expect(r.opinion).toBe('剂量超限');
  });

  it('reject：缺审方意见抛 OPINION_REQUIRED_ON_REJECT', () => {
    expect(() =>
      normalizeReviewPrescriptionArgs({ prescriptionId: 'rx-4', decision: 'reject' }),
    ).toThrow('OPINION_REQUIRED_ON_REJECT');
  });

  it('缺 prescriptionId 抛 INVALID_ARG:prescriptionId', () => {
    expect(() => normalizeReviewPrescriptionArgs({ decision: 'approve' })).toThrow(
      'INVALID_ARG:prescriptionId',
    );
  });

  it('非法 decision 抛 INVALID_ARG:decision', () => {
    expect(() =>
      normalizeReviewPrescriptionArgs({ prescriptionId: 'rx-5', decision: 'hold' }),
    ).toThrow('INVALID_ARG:decision');
  });
});

describe('summarizeOverspendByGroup（医保超支按病组聚合）', () => {
  it('仅聚合超支病例，按病组累计金额与例数，金额降序', () => {
    const summary = summarizeOverspendByGroup([
      { groupCode: 'FB29', groupName: '心衰', totalFee: 12000, estimatedPayment: 10000 }, // +2000
      { groupCode: 'FB29', groupName: '心衰', totalFee: 11500, estimatedPayment: 10000 }, // +1500
      { groupCode: 'ES29', groupName: '肺炎', totalFee: 9000, estimatedPayment: 10000 }, // 不超支，剔除
      { groupCode: 'ES29', groupName: '肺炎', totalFee: 10800, estimatedPayment: 10000 }, // +800
    ]);
    expect(summary.groups).toHaveLength(2);
    // FB29 合计 3500 > ES29 合计 800，降序
    expect(summary.groups[0].groupCode).toBe('FB29');
    expect(summary.groups[0].overspendAmount).toBe(3500);
    expect(summary.groups[0].caseCount).toBe(2);
    expect(summary.groups[1].groupCode).toBe('ES29');
    expect(summary.groups[1].overspendAmount).toBe(800);
    expect(summary.groups[1].caseCount).toBe(1);
    expect(summary.totalOverspendAmount).toBe(4300);
    expect(summary.totalCases).toBe(3);
    expect(summary.currency).toBe('CNY');
  });

  it('全部不超支时返回空聚合', () => {
    const summary = summarizeOverspendByGroup([
      { groupCode: 'FB29', totalFee: 8000, estimatedPayment: 10000 },
    ]);
    expect(summary.groups).toEqual([]);
    expect(summary.totalOverspendAmount).toBe(0);
    expect(summary.totalCases).toBe(0);
  });
});

describe('sortFollowupsByDue（随访列表排序）', () => {
  const today = '2026-10-14';
  it('逾期优先，其次按随访日期升序', () => {
    const sorted = sortFollowupsByDue(
      [
        { visitId: 'v1', patientName: '张三', dueDate: '2026-10-20' },
        { visitId: 'v2', patientName: '李四', dueDate: '2026-10-10' }, // 逾期
        { visitId: 'v3', patientName: '王五', dueDate: '2026-10-16' },
      ],
      today,
    );
    expect(sorted.map((s) => s.visitId)).toEqual(['v2', 'v3', 'v1']);
  });

  it('不修改入参数组', () => {
    const input = [
      { visitId: 'v1', patientName: '张三', dueDate: '2026-10-20' },
      { visitId: 'v2', patientName: '李四', dueDate: '2026-10-10' },
    ];
    sortFollowupsByDue(input, today);
    expect(input.map((i) => i.visitId)).toEqual(['v1', 'v2']);
  });
});
