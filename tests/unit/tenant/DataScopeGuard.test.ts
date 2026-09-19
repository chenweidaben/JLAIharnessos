/**
 * 健澜科技数智医院智能体（jlmedaios）— DataScopeGuard 单元测试
 *
 * 覆盖：谓词生成（带/不带院区）、行可见性、跨租户不可见、
 *       fail-closed（无 tenantId 不可见）、写操作断言。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, test } from 'bun:test';

import {
  DataScopeGuard,
  type TenantContext,
} from '../../../src/tenant';

const guard = new DataScopeGuard();

/** 构造一个上下文：医院 t1，指定院区 c1 */
function ctx(campusId?: string): TenantContext {
  return {
    tenantId: 't1',
    hospitalId: 't1',
    campusId,
    enabled: true,
    config: {},
  };
}

describe('DataScopeGuard - 谓词生成', () => {
  test('未指定院区 → 谓词只含 tenantId', () => {
    const pred = guard.buildPredicate(ctx());
    expect(pred).toEqual({ tenantId: 't1' });
    expect(pred.campusId).toBeUndefined();
  });

  test('指定院区 → 谓词叠加 campusId', () => {
    const pred = guard.buildPredicate(ctx('c1'));
    expect(pred).toEqual({ tenantId: 't1', campusId: 'c1' });
  });
});

describe('DataScopeGuard - 行可见性', () => {
  test('同行同租户可见；跨租户不可见', () => {
    const rowMine = { tenantId: 't1' };
    const rowOther = { tenantId: 't2' };
    expect(guard.isRowVisible(rowMine, ctx())).toBe(true);
    expect(guard.isRowVisible(rowOther, ctx())).toBe(false);
  });

  test('fail-closed：行无 tenantId 不可见', () => {
    expect(guard.isRowVisible({ campusId: 'c1' }, ctx())).toBe(false);
  });

  test('未指定院区时，本院租户下任意院区数据可见', () => {
    const r1 = { tenantId: 't1', campusId: 'c1' };
    const r2 = { tenantId: 't1', campusId: 'c2' };
    expect(guard.isRowVisible(r1, ctx())).toBe(true);
    expect(guard.isRowVisible(r2, ctx())).toBe(true);
  });

  test('指定院区时，仅该院区数据可见', () => {
    const r1 = { tenantId: 't1', campusId: 'c1' };
    const r2 = { tenantId: 't1', campusId: 'c2' };
    expect(guard.isRowVisible(r1, ctx('c1'))).toBe(true);
    expect(guard.isRowVisible(r2, ctx('c1'))).toBe(false);
  });

  test('指定院区时，无 campusId 标记的本院行也不泄露', () => {
    const row = { tenantId: 't1' };
    expect(guard.isRowVisible(row, ctx('c1'))).toBe(false);
  });

  test('filterRows 仅保留可见行，跨租户数据被剔除', () => {
    const rows = [
      { tenantId: 't1', campusId: 'c1' },
      { tenantId: 't1', campusId: 'c2' },
      { tenantId: 't2', campusId: 'c1' },
      { tenantId: 't1' },
    ];
    // 全院区视图：t1 下三行可见，t2 不可见
    expect(guard.filterRows(rows, ctx()).map((r) => r.campusId)).toEqual(['c1', 'c2', undefined]);
    // 限定 c1 院区：仅第一行可见
    expect(guard.filterRows(rows, ctx('c1'))).toEqual([{ tenantId: 't1', campusId: 'c1' }]);
  });
});

describe('DataScopeGuard - 写操作越权断言', () => {
  test('本租户行 assertRowInScope 通过', () => {
    expect(() => guard.assertRowInScope({ tenantId: 't1', campusId: 'c1' }, ctx('c1'))).not.toThrow();
  });

  test('跨租户行 assertRowInScope 抛错', () => {
    expect(() => guard.assertRowInScope({ tenantId: 't2', campusId: 'c1' }, ctx('c1'))).toThrow(
      /越权/,
    );
  });
});
