/**
 * 健澜科技 jlmedaios - M124-A 系统配置中心单测（运维工具）
 *
 * 验证纯函数层「读取 / 写入 / 分类筛选」闭环：
 *  - getConfig：命中返回值，未命中回退默认值，空 key / 非数组安全兜底；
 *  - setConfig：已存在 upsert 更新 value/updatedAt/updatedBy，不存在追加新条目，
 *    不可变（不 mutate 入参），updatedAt 为合法 ISO；
 *  - filterByCategory：大小写不敏感精确匹配，空分类返回全量并按 key 字典序，
 *    非数组安全返回空数组。
 * 全部为纯函数断言，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  filterByCategory,
  getConfig,
  setConfig,
  type SystemConfigEntry,
} from '../../src/bff/aggregators/systemConfigAggregator';

/** 构造一条配置的快捷函数 */
const rec = (over: Partial<SystemConfigEntry>): SystemConfigEntry => ({
  key: 'auth.session_timeout_minutes',
  value: '30',
  description: '会话超时',
  category: 'auth',
  updatedAt: '2026-10-16T08:00:00.000Z',
  updatedBy: 'admin001',
  ...over,
});

describe('M124-A 系统配置中心', () => {
  describe('getConfig 读取', () => {
    it('命中键返回对应值', () => {
      const list = [rec({ key: 'a.b', value: '10' }), rec({ key: 'c.d', value: 'on' })];
      expect(getConfig('a.b', 'fallback', list)).toBe('10');
      expect(getConfig('c.d', 'fallback', list)).toBe('on');
    });

    it('未命中键返回默认值', () => {
      const list = [rec({ key: 'a.b', value: '10' })];
      expect(getConfig('not.exist', 'default-x', list)).toBe('default-x');
    });

    it('空 key / 非数组 configs 安全回退默认值，不抛错', () => {
      expect(getConfig('', 'def', [rec({})])).toBe('def');
      expect(getConfig('a.b', 'def', null as unknown as SystemConfigEntry[])).toBe('def');
      expect(getConfig('a.b', 'def', undefined as unknown as SystemConfigEntry[])).toBe('def');
    });
  });

  describe('setConfig 写入（不可变 upsert）', () => {
    it('已存在键：更新 value / updatedAt / updatedBy，保留 description/category', () => {
      const original = [
        rec({ key: 'a.b', value: '30', description: '旧说明', category: 'auth', updatedBy: 'u1' }),
      ];
      const next = setConfig('a.b', '60', 'u2', original);
      // 入参不被 mutate
      expect(original[0].value).toBe('30');
      expect(original[0].updatedBy).toBe('u1');
      // 新数组中对应条目已更新
      expect(next[0].value).toBe('60');
      expect(next[0].updatedBy).toBe('u2');
      expect(next[0].description).toBe('旧说明');
      expect(next[0].category).toBe('auth');
      expect(() => new Date(next[0].updatedAt).toISOString()).not.toThrow();
    });

    it('不存在键：追加新条目，category 缺省 general，updatedAt 为合法 ISO', () => {
      const original = [rec({ key: 'a.b', value: '1' })];
      const next = setConfig('z.new', 'true', 'admin002', original);
      expect(next).toHaveLength(2);
      const added = next[1];
      expect(added.key).toBe('z.new');
      expect(added.value).toBe('true');
      expect(added.category).toBe('general');
      expect(added.updatedBy).toBe('admin002');
      expect(() => new Date(added.updatedAt).toISOString()).not.toThrow();
    });

    it('空 key：不写入，返回原数组浅拷贝', () => {
      const original = [rec({ key: 'a.b', value: '1' })];
      const next = setConfig('   ', 'x', 'u', original);
      expect(next).toHaveLength(1);
      expect(next[0].key).toBe('a.b');
      expect(next).not.toBe(original);
    });

    it('value 非字符串时字符串化；非数组 configs 安全兜底', () => {
      const next = setConfig('k', 123 as unknown as string, 'u', null as unknown as SystemConfigEntry[]);
      expect(next).toHaveLength(1);
      expect(next[0].value).toBe('123');
    });
  });

  describe('filterByCategory 分类筛选', () => {
    it('按分类精确命中（大小写不敏感）', () => {
      const list = [
        rec({ key: 'a', category: 'auth' }),
        rec({ key: 'b', category: 'notify' }),
        rec({ key: 'c', category: 'Auth' }),
      ];
      const r = filterByCategory('AUTH', list);
      expect(r).toHaveLength(2);
      expect(r.every((x) => x.category.toLowerCase() === 'auth')).toBe(true);
    });

    it('空分类返回全量，并按 key 字典序稳定排序', () => {
      const list = [
        rec({ key: 'b.z', category: 'notify' }),
        rec({ key: 'a.y', category: 'auth' }),
        rec({ key: 'c.x', category: 'feature' }),
      ];
      const r = filterByCategory('', list);
      expect(r.map((x) => x.key)).toEqual(['a.y', 'b.z', 'c.x']);
    });

    it('非数组 configs 安全返回空数组，不抛错', () => {
      expect(filterByCategory('auth', null as unknown as SystemConfigEntry[])).toEqual([]);
      expect(filterByCategory('auth', undefined as unknown as SystemConfigEntry[])).toEqual([]);
    });
  });
});
