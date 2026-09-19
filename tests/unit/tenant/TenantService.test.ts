/**
 * 健澜科技数智医院智能体（jlmedaios）— TenantService 单元测试
 *
 * 覆盖：默认租户播种、医院/院区层级、CRUD、启停、软删、配置隔离、祖先链、
 *       默认租户保护、级联软删。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, test } from 'bun:test';

import { TenantErrorCodes, TenantService } from '../../../src/tenant';

/** 每个用例使用全新服务，默认租户 id 固定为 t1 / c1，避免随机 id 干扰断言 */
function fresh(): TenantService {
  return new TenantService({
    defaultTenantId: 't1',
    defaultCampusId: 'c1',
    defaultHospitalName: '示范医院',
    defaultCampusName: '主院区',
  });
}

describe('TenantService - 默认租户播种', () => {
  test('构造即内置默认医院 + 默认院区', () => {
    const svc = fresh();
    const hosp = svc.get('t1');
    expect(hosp).toBeDefined();
    expect(hosp!.level).toBe('hospital');
    expect(hosp!.enabled).toBe(true);

    const campus = svc.get('c1');
    expect(campus).toBeDefined();
    expect(campus!.level).toBe('campus');
    expect(campus!.parentId).toBe('t1');
  });

  test('getDefaultTenantId / getDefaultCampusId 返回注入值', () => {
    const svc = fresh();
    expect(svc.getDefaultTenantId()).toBe('t1');
    expect(svc.getDefaultCampusId()).toBe('c1');
  });
});

describe('TenantService - 医院/院区层级', () => {
  test('createHospital 创建顶级医院节点', () => {
    const svc = fresh();
    const h2 = svc.createHospital('第二医院', { region: 'west' });
    expect(h2.level).toBe('hospital');
    expect(h2.parentId).toBeUndefined();
    expect(h2.config).toEqual({ region: 'west' });
    expect(svc.listHospitals().map((h) => h.id)).toContain(h2.id);
  });

  test('createCampus 挂到指定医院下', () => {
    const svc = fresh();
    const h2 = svc.createHospital('第二医院');
    const c2 = svc.createCampus(h2.id, '东院区');
    expect(c2.level).toBe('campus');
    expect(c2.parentId).toBe(h2.id);
    expect(svc.listCampuses(h2.id).map((c) => c.id)).toContain(c2.id);
  });

  test('createCampus 上级不存在/非医院 → 抛错', () => {
    const svc = fresh();
    expect(() => svc.createCampus('not-exist', 'x')).toThrow();
    // 默认院区本身是 campus，不能当父
    expect(() => svc.createCampus('c1', 'x')).toThrow();
  });

  test('tree() 返回医院→院区嵌套结构', () => {
    const svc = fresh();
    const h2 = svc.createHospital('第二医院');
    svc.createCampus(h2.id, '东院区');
    svc.createCampus(h2.id, '西院区');
    const tree = svc.tree();
    const nodeH2 = tree.find((n) => n.node.id === h2.id)!;
    expect(nodeH2.children.length).toBe(2);
    expect(nodeH2.children.every((c) => c.node.parentId === h2.id)).toBe(true);
  });

  test('ancestorChain 含自身到根', () => {
    const svc = fresh();
    const chain = svc.ancestorChain('c1');
    expect(chain).toEqual(['c1', 't1']);
  });
});

describe('TenantService - 启停与配置', () => {
  test('setEnabled 停用后 resolveActive 抛 TENANT_DISABLED', () => {
    const svc = fresh();
    const h2 = svc.createHospital('第二医院');
    svc.setEnabled(h2.id, false);
    expect(() => svc.resolveActive(h2.id)).toThrow(/已停用/);
    expect(svc.get(h2.id)!.enabled).toBe(false);
  });

  test('mergeConfig 浅合并：已存在 key 覆盖，未提及 key 保留', () => {
    const svc = fresh();
    const h2 = svc.createHospital('第二医院', { a: 1, keep: true });
    svc.mergeConfig(h2.id, { a: 2, b: 'x' });
    const node = svc.get(h2.id)!;
    expect(node.config).toEqual({ a: 2, b: 'x', keep: true });
  });

  test('租户级配置互相隔离：两个医院配置互不可见', () => {
    const svc = fresh();
    const h1 = svc.createHospital('A 院', { brand: 'A' });
    const h2 = svc.createHospital('B 院', { brand: 'B' });
    expect(svc.get(h1.id)!.config).toEqual({ brand: 'A' });
    expect(svc.get(h2.id)!.config).toEqual({ brand: 'B' });
  });
});

describe('TenantService - 软删与保护', () => {
  test('softDelete 标记 deletedAt 并停用，resolveActive 抛 TENANT_DELETED', () => {
    const svc = fresh();
    const h2 = svc.createHospital('第二医院');
    svc.softDelete(h2.id);
    expect(svc.get(h2.id)!.deletedAt).toBeDefined();
    expect(() => svc.resolveActive(h2.id)).toThrow(/已删除/);
  });

  test('软删医院级联软删其下院区', () => {
    const svc = fresh();
    const h2 = svc.createHospital('第二医院');
    const c2 = svc.createCampus(h2.id, '东院区');
    svc.softDelete(h2.id);
    expect(svc.get(c2.id)!.deletedAt).toBeDefined();
  });

  test('默认医院不可停用、不可删除', () => {
    const svc = fresh();
    try {
      svc.setEnabled('t1', false);
      throw new Error('应当抛出 DEFAULT_TENANT_PROTECTED');
    } catch (e) {
      expect((e as { code?: string }).code).toBe(TenantErrorCodes.DEFAULT_TENANT_PROTECTED);
    }
    try {
      svc.softDelete('t1');
      throw new Error('应当抛出 DEFAULT_TENANT_PROTECTED');
    } catch (e) {
      expect((e as { code?: string }).code).toBe(TenantErrorCodes.DEFAULT_TENANT_PROTECTED);
    }
  });

  test('resolveActive 不存在 → TENANT_NOT_FOUND', () => {
    const svc = fresh();
    try {
      svc.resolveActive('ghost');
      throw new Error('应当抛出 TENANT_NOT_FOUND');
    } catch (e) {
      expect((e as { code?: string }).code).toBe(TenantErrorCodes.TENANT_NOT_FOUND);
    }
  });
});
