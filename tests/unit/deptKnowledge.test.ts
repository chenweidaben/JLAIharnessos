/**
 * 健澜科技 jlmedaios - 科室知识沉淀引擎（M101-A）纯函数单测
 *
 * 覆盖：rankBySuccess 成功率降序、usage_count 次级排序、title 三级排序、
 *       不修改原数组；recordUsage 使用次数自增、滑动成功均值重算、
 *       首次使用与多次采纳的累计口径。全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  rankBySuccess,
  recordUsage,
  type DeptKnowledgeEntry,
} from '../../src/bff/aggregators/deptKnowledgeAggregator';

/** 构造测试条目（默认成功/使用次数可覆盖） */
function makeEntry(
  title: string,
  successRate: number,
  usageCount = 1,
): DeptKnowledgeEntry {
  return {
    id: `id-${title}`,
    deptCode: 'DEP-IM',
    knowledgeType: 'pathway',
    title,
    content: `content-${title}`,
    source: 'system',
    usageCount,
    successRate,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('rankBySuccess 按采纳成功率降序排序', () => {
  it('成功率高者排在前面', () => {
    const low = makeEntry('low', 0.5);
    const high = makeEntry('high', 0.9);
    const mid = makeEntry('mid', 0.7);
    const sorted = rankBySuccess([low, high, mid]);
    expect(sorted.map((e) => e.title)).toEqual(['high', 'mid', 'low']);
  });

  it('成功率相同时，usage_count 高者优先', () => {
    const few = makeEntry('few-uses', 0.8, 10);
    const many = makeEntry('many-uses', 0.8, 80);
    const sorted = rankBySuccess([few, many]);
    expect(sorted.map((e) => e.title)).toEqual(['many-uses', 'few-uses']);
  });

  it('成功率与使用次数都相同时，按标题字典序升序，结果确定', () => {
    const b = makeEntry('beta', 0.8, 10);
    const a = makeEntry('alpha', 0.8, 10);
    const sorted = rankBySuccess([b, a]);
    expect(sorted.map((e) => e.title)).toEqual(['alpha', 'beta']);
  });

  it('纯函数：不修改入参数组顺序', () => {
    const low = makeEntry('low', 0.5);
    const high = makeEntry('high', 0.9);
    const input = [low, high];
    rankBySuccess(input);
    expect(input.map((e) => e.title)).toEqual(['low', 'high']);
  });

  it('空数组返回空数组', () => {
    expect(rankBySuccess([])).toEqual([]);
  });
});

describe('recordUsage 记录一次采纳并增量重算成功率', () => {
  it('使用次数自增 1', () => {
    const e = makeEntry('x', 0.5, 4);
    const next = recordUsage(e, true);
    expect(next.usageCount).toBe(5);
  });

  it('首次使用（usage=0）成功 → 成功率为 1', () => {
    const e = { ...makeEntry('x', 0, 0) };
    const next = recordUsage(e, true);
    expect(next.successRate).toBe(1);
  });

  it('首次使用（usage=0）失败 → 成功率为 0', () => {
    const e = { ...makeEntry('x', 0, 0) };
    const next = recordUsage(e, false);
    expect(next.successRate).toBe(0);
  });

  it('滑动均值：既有 4 次全部成功(1.0)，再成功一次仍为 1.0', () => {
    const e = makeEntry('x', 1.0, 4);
    expect(recordUsage(e, true).successRate).toBe(1);
  });

  it('滑动均值：既有 4 次全部成功(1.0)，失败一次 → 4/5=0.8', () => {
    const e = makeEntry('x', 1.0, 4);
    expect(recordUsage(e, false).successRate).toBe(0.8);
  });

  it('滑动均值：既有 2 次成功 1 次(0.5)，再成功 → (1+1)/3≈0.6667', () => {
    const e = makeEntry('x', 0.5, 2);
    expect(recordUsage(e, true).successRate).toBe(0.6667);
  });

  it('纯函数：不修改原条目，其他字段原样透传', () => {
    const e = makeEntry('keep', 0.5, 2);
    const next = recordUsage(e, true);
    expect(e.usageCount).toBe(2);
    expect(e.successRate).toBe(0.5);
    expect(next.id).toBe(e.id);
    expect(next.title).toBe(e.title);
    expect(next.updatedAt).toBe(e.updatedAt);
  });
});
