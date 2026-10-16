/**
 * 健澜科技 jlmedaios - 输血管理纯函数单测（M224-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessTransfusionAppropriateness,
  buildTransfusionReport,
  handleTransfusionReaction,
} from '../../src/bff/aggregators/transfusionReportAggregator';

describe('assessTransfusionAppropriateness', () => {
  it('Hb 60 非急性 → 合适', () => {
    expect(assessTransfusionAppropriateness(60, '择期手术').appropriate).toBe(true);
  });

  it('Hb 90 非急性 → 不合适', () => {
    expect(assessTransfusionAppropriateness(90, '择期手术').appropriate).toBe(false);
  });
});

describe('handleTransfusionReaction', () => {
  it('溶血反应 → 紧急抢救', () => {
    expect(handleTransfusionReaction('溶血反应').urgent).toBe(true);
  });

  it('发热反应 → 观察', () => {
    expect(handleTransfusionReaction('发热').urgent).toBe(false);
  });
});

describe('buildTransfusionReport', () => {
  it('生成申请数据', () => {
    const r = buildTransfusionReport('30d');
    expect(r.request.orders).toBeGreaterThan(0);
  });

  it('生成库存数据', () => {
    const r = buildTransfusionReport('30d');
    expect(r.inventory.units).toBeGreaterThan(0);
  });

  it('生成反应数据', () => {
    const r = buildTransfusionReport('30d');
    expect(r.reaction.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildTransfusionReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
