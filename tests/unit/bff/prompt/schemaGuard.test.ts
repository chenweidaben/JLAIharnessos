/**
 * 健澜AI原生医院操作系统OS - Schema 守卫单元测试（S-04）
 *
 * 覆盖：轻量 Schema 子集校验（type / required / properties / enum）、重试决策与
 * 指数退避、按风险等级降级动作、事件台账留痕与重置。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  validateSchema,
  planSchemaRetry,
  SchemaGuard,
  getSchemaGuard,
  listSchemaEvents,
  _resetSchemaGuard,
} from '@/bff/prompt/schemaGuard.js';

const recordSchema: Record<string, unknown> = {
  type: 'object',
  required: ['chiefComplaint', 'diagnosis'],
  properties: {
    chiefComplaint: { type: 'string' },
    diagnosis: { type: 'string' },
    age: { type: 'number' },
    severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
  },
};

beforeEach(() => {
  _resetSchemaGuard();
});

// ============================================================================
// validateSchema 轻量子集校验
// ============================================================================

describe('validateSchema - 轻量子集校验', () => {
  it('必填齐全且类型 / 枚举合法时通过', () => {
    const output = { chiefComplaint: '胸痛 2 小时', diagnosis: '急性冠脉综合征', age: 62, severity: 'severe' };
    const result = validateSchema(output, recordSchema);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('缺失 required 字段被捕获', () => {
    const result = validateSchema({ chiefComplaint: '胸痛' }, recordSchema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('diagnosis'))).toBe(true);
  });

  it('字段类型错误被捕获', () => {
    const result = validateSchema(
      { chiefComplaint: '胸痛', diagnosis: '心梗', age: '六十岁' },
      recordSchema,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('age'))).toBe(true);
  });

  it('枚举取值不合法被捕获', () => {
    const result = validateSchema(
      { chiefComplaint: '胸痛', diagnosis: '心梗', severity: 'critical' },
      recordSchema,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('枚举'))).toBe(true);
  });

  it('type=array 输出非数组被捕获', () => {
    const result = validateSchema({}, { type: 'array' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('array'))).toBe(true);
  });

  it('根节点枚举不合法被捕获；additionalProperties 不阻断', () => {
    const enumSchema: Record<string, unknown> = { type: 'string', enum: ['mild', 'severe'] };
    expect(validateSchema('critical', enumSchema).valid).toBe(false);
    const extra = validateSchema({ chiefComplaint: '胸痛', diagnosis: '心梗', extra: '不应阻断' }, recordSchema);
    expect(extra.valid).toBe(true);
  });

  it('schema 缺少 type 时记录错误但不抛异常', () => {
    expect(() => validateSchema({}, {})).not.toThrow();
    const result = validateSchema({}, {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// planSchemaRetry 重试决策
// ============================================================================

describe('planSchemaRetry - 重试与降级决策', () => {
  it('重试窗口内返回 retry，backoffMs 指数增长（1s / 2s）', () => {
    const first = planSchemaRetry(1, 2, 'medium');
    expect(first.shouldRetry).toBe(true);
    expect(first.action).toBe('retry');
    expect(first.backoffMs).toBe(1000);

    const second = planSchemaRetry(2, 2, 'medium');
    expect(second.shouldRetry).toBe(true);
    expect(second.action).toBe('retry');
    expect(second.backoffMs).toBe(2000);
  });

  it('重试耗尽按风险等级降级：low 模板兜底 / medium 人工队列 / high 阻断提交', () => {
    const low = planSchemaRetry(3, 2, 'low');
    expect(low.shouldRetry).toBe(false);
    expect(low.action).toBe('template-fallback');
    expect(low.backoffMs).toBe(0);

    const medium = planSchemaRetry(3, 2, 'medium');
    expect(medium.shouldRetry).toBe(false);
    expect(medium.action).toBe('manual-queue');

    const high = planSchemaRetry(3, 2, 'high');
    expect(high.shouldRetry).toBe(false);
    expect(high.action).toBe('block-submit');
  });
});

// ============================================================================
// SchemaGuard 事件台账
// ============================================================================

describe('SchemaGuard - 判定事件台账', () => {
  it('合法输出记录 valid=true、attempt=0、action=retry', () => {
    const guard = new SchemaGuard();
    const decision = guard.checkAndPlan(
      { chiefComplaint: '胸痛', diagnosis: '心梗' },
      recordSchema,
      { assetId: 'p-001', version: '1.0.0', agentId: 'ag-01', scenario: 'outpatient-record' },
    );
    expect(decision.shouldRetry).toBe(false);
    const events = guard.listSchemaEvents();
    expect(events).toHaveLength(1);
    expect(events[0].valid).toBe(true);
    expect(events[0].attempt).toBe(0);
    expect(events[0].action).toBe('retry');
    expect(events[0].assetId).toBe('p-001');
    expect(events[0].scenario).toBe('outpatient-record');
  });

  it('失败累计到阈值后按 medium 降级，事件记录每次判定动作与错误', () => {
    const guard = new SchemaGuard();
    const invalid = { chiefComplaint: '胸痛' };
    const d1 = guard.checkAndPlan(invalid, recordSchema, { riskLevel: 'medium', agentId: 'ag-01' });
    const d2 = guard.checkAndPlan(invalid, recordSchema, { riskLevel: 'medium', agentId: 'ag-01' });
    const d3 = guard.checkAndPlan(invalid, recordSchema, { riskLevel: 'medium', agentId: 'ag-01' });

    expect(d1.action).toBe('retry');
    expect(d1.attempt).toBe(1);
    expect(d2.action).toBe('retry');
    expect(d2.attempt).toBe(2);
    expect(d3.action).toBe('manual-queue');
    expect(d3.shouldRetry).toBe(false);

    const events = guard.listSchemaEvents();
    expect(events).toHaveLength(3);
    expect(events[0].errors.length).toBeGreaterThan(0);
    expect(events.map((e) => e.action)).toEqual(['retry', 'retry', 'manual-queue']);
  });

  it('校验成功后失败计数清零，再次失败从 attempt=1 开始', () => {
    const guard = new SchemaGuard();
    const invalid = { chiefComplaint: '胸痛' };
    guard.checkAndPlan(invalid, recordSchema, { agentId: 'ag-01' });
    guard.checkAndPlan({ chiefComplaint: '胸痛', diagnosis: '心梗' }, recordSchema, { agentId: 'ag-01' });
    const retry = guard.checkAndPlan(invalid, recordSchema, { agentId: 'ag-01' });
    expect(retry.attempt).toBe(1);
  });

  it('模块单例事件台账可查询；_resetSchemaGuard 清空事件', () => {
    const guard = getSchemaGuard();
    guard.checkAndPlan({ chiefComplaint: '胸痛', diagnosis: '心梗' }, recordSchema);
    expect(listSchemaEvents()).toHaveLength(1);
    _resetSchemaGuard();
    expect(listSchemaEvents()).toHaveLength(0);
  });
});
