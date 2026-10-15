/**
 * 健澜科技 jlmedaios - 患者随访学习引擎单测（M33）
 *
 * 纯函数、确定性、无 I/O。覆盖间隔计算、应答率调整与空数据兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import { buildFollowupPlan, type FollowupHistoryItem } from '../../src/bff/aggregators/followupLearningAggregator.js';

describe('M33 buildFollowupPlan 空数据兜底', () => {
  it('无历史 -> 按疾病默认间隔', () => {
    const plan = buildFollowupPlan([], 'diabetes');
    expect(plan.intervalDays).toBe(30);
    expect(plan.frequency).toBe('每月');
  });

  it('null/undefined -> 走默认兜底', () => {
    expect(buildFollowupPlan(null, 'hypertension').intervalDays).toBe(90);
    expect(buildFollowupPlan(undefined, 'unknown-disease').intervalDays).toBe(90);
  });
});

describe('M33 buildFollowupPlan 间隔计算', () => {
  it('应答率适中 -> 维持默认间隔', () => {
    const history: FollowupHistoryItem[] = [
      { responded: true },
      { responded: false },
    ];
    // responseRate = 0.5，不满足 <0.5，维持 30 天
    const plan = buildFollowupPlan(history, 'diabetes');
    expect(plan.intervalDays).toBe(30);
  });

  it('不同疾病类型默认间隔不同', () => {
    expect(buildFollowupPlan([], 'hypertension').intervalDays).toBe(90);
    expect(buildFollowupPlan([], 'tumor').intervalDays).toBe(14);
    expect(buildFollowupPlan([], 'coronary').intervalDays).toBe(60);
  });
});

describe('M33 buildFollowupPlan 应答率调整', () => {
  it('应答率高 -> 延长间隔 1.5 倍', () => {
    const history: FollowupHistoryItem[] = [
      { responded: true },
      { responded: true },
      { responded: true },
    ];
    // diabetes base 30 -> round(45) = 45
    const plan = buildFollowupPlan(history, 'diabetes');
    expect(plan.intervalDays).toBe(45);
  });

  it('应答率低 -> 间隔缩短一半', () => {
    const history: FollowupHistoryItem[] = [
      { responded: false },
      { responded: false },
    ];
    // diabetes base 30 -> round(15) = 15
    const plan = buildFollowupPlan(history, 'diabetes');
    expect(plan.intervalDays).toBe(15);
  });

  it('应答率低且基数小 -> 不低于 7 天', () => {
    const history: FollowupHistoryItem[] = [
      { responded: false },
      { responded: false },
    ];
    // tumor base 14 -> round(7) = 7，下限保护
    const plan = buildFollowupPlan(history, 'tumor');
    expect(plan.intervalDays).toBe(7);
  });

  it('历史异常指标 -> 加密至 14 天（异常优先）', () => {
    const history: FollowupHistoryItem[] = [
      { responded: true, abnormal: true },
      { responded: true },
    ];
    // 即使应答率高，异常指标仍强制加密
    const plan = buildFollowupPlan(history, 'hypertension');
    expect(plan.intervalDays).toBe(14);
    expect(plan.frequency).toBe('每两周');
  });

  it('reason 字段包含推荐依据', () => {
    const plan = buildFollowupPlan([{ responded: true }, { responded: true }], 'diabetes');
    expect(plan.reason).toContain('diabetes');
    expect(plan.reason).toContain('应答');
    expect(plan.reason.length).toBeGreaterThan(0);
  });
});
