/**
 * 健澜科技 jlmedaios - M124-B 系统数据备份/恢复单测（运维工具）
 *
 * 验证纯函数层「打包 -> 校验 -> 还原」闭环：
 *  - 导出格式：信封 tool/kind/version/exportedAt/tables/rowCounts/checksum/data 齐备；
 *  - 导入恢复：importSystemData 还原出与导出一致的表清单与行数据；
 *  - 数据一致性：导出->导入往返数据不丢；非数组行集兜底；损坏/篡改/异系统文件被拒。
 * 全部为纯函数断言，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  BACKUP_TOOL,
  BACKUP_VERSION,
  exportSystemData,
  fnv1aHex,
  importSystemData,
} from '../../src/bff/aggregators/backupAggregator';

describe('M124-B 系统数据备份/恢复', () => {
  it('导出格式：信封字段齐备，版本与工具标识固定', () => {
    const env = exportSystemData(['medmuse.data_access_log'], {
      'medmuse.data_access_log': [{ id: 1, staff_id: 'D001' }],
    });
    expect(env.tool).toBe(BACKUP_TOOL);
    expect(env.kind).toBe('system-backup');
    expect(env.version).toBe(BACKUP_VERSION);
    expect(env.tables).toEqual(['medmuse.data_access_log']);
    expect(env.rowCounts['medmuse.data_access_log']).toBe(1);
    expect(typeof env.exportedAt).toBe('string');
    expect(() => new Date(env.exportedAt).toISOString()).not.toThrow();
    // 校验和为 16 位 hex
    expect(env.checksum).toMatch(/^[0-9a-f]{16}$/);
    expect(Array.isArray(env.data['medmuse.data_access_log'])).toBe(true);
  });

  it('导出格式：非数组行集兜底为空数组，行数统计准确', () => {
    const env = exportSystemData(['a', 'b', 'c'], {
      a: [{ x: 1 }],
      b: null, // 非法值 -> 空数组
      // c 缺省 -> 空数组
    } as unknown as Record<string, unknown[]>);
    expect(env.rowCounts.a).toBe(1);
    expect(env.rowCounts.b).toBe(0);
    expect(env.rowCounts.c).toBe(0);
    expect(env.data.b).toEqual([]);
    expect(env.data.c).toEqual([]);
  });

  it('导出格式：tables 缺省回退为 data 的键集合', () => {
    const env = exportSystemData([], {
      t1: [{ v: 1 }],
      t2: [{ v: 2 }],
    });
    expect(env.tables.sort()).toEqual(['t1', 't2']);
  });

  it('导入恢复：解析导出信封，表清单与行数据原样还原', () => {
    const env = exportSystemData(['clinical.beds'], {
      'clinical.beds': [{ id: 'B-1', status: 'available' }],
    });
    const restored = importSystemData(JSON.stringify(env));
    expect(restored.version).toBe(BACKUP_VERSION);
    expect(restored.tables).toEqual(['clinical.beds']);
    expect(restored.rowCounts['clinical.beds']).toBe(1);
    expect(restored.data['clinical.beds']).toEqual([{ id: 'B-1', status: 'available' }]);
  });

  it('导入恢复：同时接受字符串与已解析对象入参', () => {
    const env = exportSystemData(['a'], { a: [{ n: 1 }] });
    const fromStr = importSystemData(JSON.stringify(env));
    const fromObj = importSystemData(env);
    expect(fromStr.data).toEqual(fromObj.data);
    expect(fromStr.rowCounts).toEqual(fromObj.rowCounts);
  });

  it('数据一致性：导出->导入往返多表数据不丢不改', () => {
    const source = {
      'medmuse.data_access_log': [{ id: 1, staff_id: 'D001' }, { id: 2, staff_id: 'N009' }],
      'clinical.beds': [{ id: 'B-1', status: 'occupied' }],
    };
    const env = exportSystemData(Object.keys(source), source);
    const restored = importSystemData(JSON.stringify(env));
    expect(restored.data).toEqual(source);
  });

  it('数据一致性：校验和确定性——同数据两次导出校验和相同', () => {
    const d = { t: [{ a: 1 }] };
    const e1 = exportSystemData(['t'], d);
    const e2 = exportSystemData(['t'], d);
    expect(e1.checksum).toBe(e2.checksum);
    // fnv1aHex 自身确定性
    expect(fnv1aHex('hello')).toBe(fnv1aHex('hello'));
  });

  it('异常拦截：被篡改的 data 导致校验和不匹配，导入被拒', () => {
    const env = exportSystemData(['t'], { t: [{ a: 1 }] });
    const tampered = { ...env, data: { t: [{ a: 999 }] } };
    expect(() => importSystemData(JSON.stringify(tampered))).toThrow(/校验和不匹配/);
  });

  it('异常拦截：非法 JSON / 空内容被拒', () => {
    expect(() => importSystemData('not a json')).toThrow(/合法 JSON/);
    expect(() => importSystemData('')).toThrow(/为空/);
  });

  it('异常拦截：异系统文件（tool/kind 不符）被拒', () => {
    const env = exportSystemData(['t'], { t: [] });
    expect(() => importSystemData(JSON.stringify({ ...env, tool: 'other-tool' }))).toThrow(/非本系统/);
    expect(() => importSystemData(JSON.stringify({ ...env, kind: 'other-kind' }))).toThrow(/种类错误/);
  });

  it('异常拦截：信封结构缺失字段被拒', () => {
    expect(() => importSystemData(JSON.stringify({ tool: BACKUP_TOOL }))).toThrow();
    expect(() => importSystemData(JSON.stringify(123))).toThrow(/结构错误/);
    expect(() => importSystemData(JSON.stringify([1, 2, 3]))).toThrow(/结构错误/);
  });
});
