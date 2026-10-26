/**
 * 健澜AI原生医院操作系统OS - A34 工具频次 / 配额限流纯内存模块单元测试
 *
 * 覆盖：未配置策略默认放行、窗口内累计与剩余额度、超限限流、角色集合匹配、
 * 窗口过期重置、工具 / 角色计数隔离、策略结构校验、只读判定不计数、单例重置。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  ToolQuotaGuard,
  QUOTA_UNLIMITED,
  validateToolQuotaPolicy,
  getToolQuotaGuard,
  _resetToolQuotaGuard,
} from '@/orchestrator/engine/toolQuota.js';

const T0 = 1_761_000_000_000;

describe('ToolQuotaGuard - 未配置策略默认放行', () => {
  it('未登记策略的工具直接放行，剩余额度为无限大，不计入计数器', () => {
    const guard = new ToolQuotaGuard();
    const evaluated = guard.evaluate('query_patient', 'doctor-demo-001', T0);
    expect(evaluated.decision).toBe('allowed');
    expect(evaluated.remaining).toBe(QUOTA_UNLIMITED);
    expect(evaluated.policyToolId).toBeUndefined();

    const consumed = guard.consume('query_patient', 'doctor-demo-001', T0);
    expect(consumed.decision).toBe('allowed');
    expect(consumed.remaining).toBe(QUOTA_UNLIMITED);
  });
});

describe('ToolQuotaGuard - 窗口内累计与超限限流', () => {
  beforeEach(() => {
    _resetToolQuotaGuard();
  });

  it('窗口内按次累计，剩余额度递减；达到上限后限流且不再累计', () => {
    const guard = getToolQuotaGuard();
    guard.registerPolicy({ toolId: 'query_patient', windowMs: 60_000, limit: 3 });

    const first = guard.consume('query_patient', undefined, T0);
    expect(first.decision).toBe('allowed');
    expect(first.remaining).toBe(2);
    expect(guard.consume('query_patient', undefined, T0 + 1_000).remaining).toBe(1);
    expect(guard.consume('query_patient', undefined, T0 + 2_000).remaining).toBe(0);

    const throttled = guard.consume('query_patient', undefined, T0 + 3_000);
    expect(throttled.decision).toBe('throttled');
    expect(throttled.remaining).toBe(0);
    expect(throttled.policyToolId).toBe('query_patient');
    expect(throttled.reason).toContain('query_patient');
    expect(throttled.reason).toContain('上限 3');
  });

  it('evaluate 为只读判定，不累计计数；多次 evaluate 剩余额度不变', () => {
    const guard = new ToolQuotaGuard();
    guard.registerPolicy({ toolId: 'tool-a', windowMs: 60_000, limit: 2 });
    expect(guard.evaluate('tool-a', undefined, T0).remaining).toBe(2);
    expect(guard.evaluate('tool-a', undefined, T0 + 1_000).remaining).toBe(2);
    expect(guard.listPolicies()).toHaveLength(1);
  });

  it('不同工具计数器互相隔离，互不影响额度', () => {
    const guard = new ToolQuotaGuard();
    guard.registerPolicy({ toolId: 'tool-a', windowMs: 60_000, limit: 1 });
    guard.registerPolicy({ toolId: 'tool-b', windowMs: 60_000, limit: 2 });

    guard.consume('tool-a', undefined, T0);
    expect(guard.consume('tool-a', undefined, T0).decision).toBe('throttled');
    expect(guard.consume('tool-b', undefined, T0).decision).toBe('allowed');
    expect(guard.consume('tool-b', undefined, T0).decision).toBe('allowed');
  });
});

describe('ToolQuotaGuard - 角色集合匹配', () => {
  it('配置角色集合后，仅集合内角色受策略约束；集合外角色默认放行', () => {
    const guard = new ToolQuotaGuard();
    guard.registerPolicy({ toolId: 'write_prescription', roles: ['doctor'], windowMs: 60_000, limit: 1 });

    expect(guard.consume('write_prescription', 'doctor', T0).decision).toBe('allowed');
    expect(guard.consume('write_prescription', 'doctor', T0).decision).toBe('throttled');
    expect(guard.consume('write_prescription', 'nurse', T0).decision).toBe('allowed');
    expect(guard.consume('write_prescription', undefined, T0).decision).toBe('allowed');
  });

  it('不同角色计数器按键隔离，额度互不挤占', () => {
    const guard = new ToolQuotaGuard();
    guard.registerPolicy({ toolId: 'tool-r', roles: ['doctor', 'nurse'], windowMs: 60_000, limit: 1 });
    expect(guard.consume('tool-r', 'doctor', T0).decision).toBe('allowed');
    expect(guard.consume('tool-r', 'doctor', T0).decision).toBe('throttled');
    expect(guard.consume('tool-r', 'nurse', T0).decision).toBe('allowed');
  });
});

describe('ToolQuotaGuard - 窗口过期重置', () => {
  it('窗口外计数不累计：超过 windowMs 后计数清零，可再次放行', () => {
    const guard = new ToolQuotaGuard();
    guard.registerPolicy({ toolId: 'tool-w', windowMs: 60_000, limit: 2 });

    guard.consume('tool-w', undefined, T0);
    guard.consume('tool-w', undefined, T0 + 1_000);
    expect(guard.consume('tool-w', undefined, T0 + 2_000).decision).toBe('throttled');

    const afterExpire = guard.consume('tool-w', undefined, T0 + 60_000);
    expect(afterExpire.decision).toBe('allowed');
    expect(afterExpire.remaining).toBe(1);
  });

  it('窗口边界：恰好在 windowMs 处视为过期重置', () => {
    const guard = new ToolQuotaGuard();
    guard.registerPolicy({ toolId: 'tool-e', windowMs: 30_000, limit: 1 });
    guard.consume('tool-e', undefined, T0);
    const boundary = guard.consume('tool-e', undefined, T0 + 30_000);
    expect(boundary.decision).toBe('allowed');
  });
});

describe('ToolQuotaGuard - 策略结构校验', () => {
  it('非法策略返回中文错误清单并拒绝登记', () => {
    expect(validateToolQuotaPolicy(null).length).toBeGreaterThan(0);
    expect(validateToolQuotaPolicy({ toolId: '', windowMs: 60_000, limit: 1 })[0]).toContain('toolId');
    expect(validateToolQuotaPolicy({ toolId: 't', windowMs: 0, limit: 1 })[0]).toContain('windowMs');
    expect(validateToolQuotaPolicy({ toolId: 't', windowMs: 60_000, limit: -1 })[0]).toContain('limit');
    expect(validateToolQuotaPolicy({ toolId: 't', windowMs: 60_000, limit: 1, roles: 'doctor' })[0]).toContain('roles');
  });

  it('登记非法策略抛中文错误并附 QUOTA- 前缀', () => {
    const guard = new ToolQuotaGuard();
    expect(() => guard.registerPolicy({ toolId: 't', windowMs: 60_000, limit: -2 })).toThrow(/QUOTA-/);
  });

  it('reset 清空策略与计数器', () => {
    const guard = new ToolQuotaGuard();
    guard.registerPolicy({ toolId: 'tool-x', windowMs: 60_000, limit: 1 });
    guard.consume('tool-x', undefined, T0);
    guard.reset();
    expect(guard.listPolicies()).toEqual([]);
    expect(guard.evaluate('tool-x', undefined, T0).decision).toBe('allowed');
  });
});
