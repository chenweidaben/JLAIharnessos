/**
 * 健澜科技 jlmedaios - M133-A 多医院数据隔离单测
 *
 * 【SaaS化+智慧度】验证多租户行级隔离红线，全部纯函数断言、不依赖数据库：
 *  - 数据隔离：withTenantScope 必带 hospital_id 谓词，filterRowsByScope 只留本院行；
 *  - 越权拦截：validateTenantAccess 对跨院/未知员工/空参一律 fail-closed 返回 false；
 *  - 跨院不可见：作用域外医院的行、缺 hospital_id 的脏行一律不可见；
 *  - 防串院：调用方预埋的 hospital_id 谓词被权威覆盖，不能借之越权。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  filterRowsByScope,
  HOSPITAL_COLUMN,
  resetStaffDirectory,
  seedStaffDirectory,
  TenantScopeError,
  validateTenantAccess,
  withTenantScope,
  type HospitalScopedRow,
} from '../../src/bff/aggregators/tenantAggregator';

/** 模拟一张业务表行（仅关心 hospitalId 标记） */
interface FakeRow extends HospitalScopedRow {
  id: string;
  note: string;
}

const row = (id: string, hospitalId: string | null | undefined): FakeRow => ({
  id,
  hospitalId,
  note: `row-${id}`,
});

beforeEach(() => {
  // 每个用例独立目录，避免进程单例串扰
  resetStaffDirectory();
  seedStaffDirectory([
    { staffId: 'doc-h1-001', hospitalId: 'h-alpha' }, // 仅属于 alpha 院
    { staffId: 'doc-h2-001', hospitalId: 'h-beta' }, // 仅属于 beta 院
    { staffId: 'doc-dual-001', hospitalId: 'h-alpha' },
    { staffId: 'doc-dual-001', hospitalId: 'h-beta' }, // 一人挂两院
  ]);
});

describe('M133-A 多医院数据隔离', () => {
  describe('withTenantScope 数据隔离谓词', () => {
    it('强制叠加 hospital_id = 当前医院，且不可变返回', () => {
      const base = { table: 'clinical.visits', filters: [{ column: 'status', op: '=' as const, value: 'ongoing' }] };
      const scope = withTenantScope(base, 'h-alpha');

      expect(scope.table).toBe('clinical.visits');
      expect(scope.hospitalColumn).toBe(HOSPITAL_COLUMN);
      expect(scope.hospitalScope).toBe('h-alpha');
      const hospPred = scope.filters.find((f) => f.column === HOSPITAL_COLUMN);
      expect(hospPred?.value).toBe('h-alpha');
      // 业务条件保留
      expect(scope.filters.some((f) => f.column === 'status')).toBe(true);
      // 不可变：原 query 未被写入
      expect(base.filters?.some((f) => f.column === HOSPITAL_COLUMN)).toBe(false);
    });

    it('空 hospitalId 抛错（fail-closed，绝不生成全院可见查询）', () => {
      expect(() => withTenantScope({ table: 'clinical.visits' }, '')).toThrow(TenantScopeError);
      expect(() => withTenantScope({ table: 'clinical.visits' }, '   ')).toThrow(TenantScopeError);
    });

    it('权威覆盖：调用方预埋的 hospital_id=别院 不能越权', () => {
      const base = {
        table: 'clinical.orders',
        filters: [{ column: HOSPITAL_COLUMN, op: '=' as const, value: 'h-beta' }],
      };
      const scope = withTenantScope(base, 'h-alpha');
      const hospPreds = scope.filters.filter((f) => f.column === HOSPITAL_COLUMN);
      // 只允许一条医院谓词，且必须是可信入参
      expect(hospPreds).toHaveLength(1);
      expect(hospPreds[0].value).toBe('h-alpha');
    });
  });

  describe('filterRowsByScope 跨院不可见', () => {
    it('只保留本院行，他院行不可见，缺标记脏行不可见', () => {
      const rows: FakeRow[] = [
        row('a1', 'h-alpha'),
        row('a2', 'h-alpha'),
        row('b1', 'h-beta'),
        row('ghost', null),
        row('empty', undefined),
      ];
      const scope = withTenantScope({ table: 'clinical.visits' }, 'h-alpha');
      const visible = filterRowsByScope(rows, scope);

      expect(visible.map((r) => r.id).sort()).toEqual(['a1', 'a2']);
    });

    it('切换作用域到 beta 院后，alpha 院行转为不可见（隔离双向成立）', () => {
      const rows: FakeRow[] = [row('a1', 'h-alpha'), row('b1', 'h-beta')];
      const beta = filterRowsByScope(rows, withTenantScope({ table: 'clinical.visits' }, 'h-beta'));
      expect(beta.map((r) => r.id)).toEqual(['b1']);
    });
  });

  describe('validateTenantAccess 越权拦截', () => {
    it('本院员工访问本院 → 放行', () => {
      expect(validateTenantAccess('doc-h1-001', 'h-alpha')).toBe(true);
      expect(validateTenantAccess('doc-h2-001', 'h-beta')).toBe(true);
    });

    it('本院员工访问他院 → 拦截（false）', () => {
      expect(validateTenantAccess('doc-h1-001', 'h-beta')).toBe(false);
      expect(validateTenantAccess('doc-h2-001', 'h-alpha')).toBe(false);
    });

    it('一人挂两院 → 两院均放行，第三院仍拦截', () => {
      expect(validateTenantAccess('doc-dual-001', 'h-alpha')).toBe(true);
      expect(validateTenantAccess('doc-dual-001', 'h-beta')).toBe(true);
      expect(validateTenantAccess('doc-dual-001', 'h-gamma')).toBe(false);
    });

    it('未知员工 / 空参 → fail-closed 一律拒绝', () => {
      expect(validateTenantAccess('ghost-staff', 'h-alpha')).toBe(false);
      expect(validateTenantAccess('', 'h-alpha')).toBe(false);
      expect(validateTenantAccess('doc-h1-001', '')).toBe(false);
      expect(validateTenantAccess('', '')).toBe(false);
    });
  });
});
