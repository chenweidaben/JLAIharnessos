/**
 * 健澜科技 jlmedaios - 智能随访 V2 纯函数单测（M184-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildSmartFollowup,
  predictFollowupRisk,
} from '../../src/bff/aggregators/smartFollowupV2Aggregator';

describe('buildSmartFollowup', () => {
  it('术后随访包含 1/7/30/90 天节点', () => {
    const plan = buildSmartFollowup('p1', 'post_op');
    expect(plan.nodes.map((n) => n.dayOffset)).toEqual([1, 7, 30, 90]);
  });

  it('高血压慢病包含 7/30/90 天节点', () => {
    const plan = buildSmartFollowup('p1', 'hypertension');
    expect(plan.nodes.length).toBe(3);
    expect(plan.nodes[0].dayOffset).toBe(7);
  });

  it('满意度随访仅出院后3天', () => {
    const plan = buildSmartFollowup('p1', 'satisfaction');
    expect(plan.nodes).toHaveLength(1);
    expect(plan.nodes[0].dayOffset).toBe(3);
  });
});

describe('predictFollowupRisk', () => {
  it('低风险：年轻无合并症', () => {
    const r = predictFollowupRisk('p1', 40, 0, 0, 0);
    expect(r.riskLevel).toBe('low');
    expect(r.score).toBe(0);
  });

  it('高风险：高龄 + 合并症 + 再入院', () => {
    const r = predictFollowupRisk('p1', 80, 4, 2, 3);
    expect(r.riskLevel).toBe('high');
    expect(r.score).toBeGreaterThanOrEqual(5);
    expect(r.factors.length).toBeGreaterThan(0);
  });

  it('中风险：单一再入院因素', () => {
    const r = predictFollowupRisk('p1', 60, 0, 1, 0);
    expect(r.riskLevel).toBe('medium');
    expect(r.score).toBe(3);
  });
});
