/**
 * 健澜科技 jlmedaios - 数据库迁移状态聚合器单测（M124-C）
 *
 * 【运维工具】
 * 覆盖：getMigrationStatus（状态统计 / recent10 排序 / failures 透传 / 空值防御）、
 * runPendingMigrations（全部成功 / 部分失败不中断 / 错误收集 / 空入参）、
 * 进程内失败登记（recordMigrationFailure / listMigrationFailures / clearMigrationFailures）。
 * 全部为纯函数用例，不触碰 DB / 文件系统。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, it } from 'bun:test';

import {
  clearMigrationFailures,
  getMigrationStatus,
  listMigrationFailures,
  recordMigrationFailure,
  runPendingMigrations,
  type MigrationDescriptor,
} from '../../src/bff/aggregators/migrationStatusAggregator';

/* 构造一条迁移描述符的便捷函数 */
function desc(
  version: string,
  status: MigrationDescriptor['status'],
  executedAt?: string,
  error?: string,
): MigrationDescriptor {
  return {
    version,
    filename: version,
    status,
    executedAt,
    error,
  };
}

afterEach(() => {
  clearMigrationFailures();
});

/* ------------------------------------------------------------------ */
/* getMigrationStatus                                                  */
/* ------------------------------------------------------------------ */

describe('getMigrationStatus', () => {
  it('空数组 / 非数组 → 零值视图', () => {
    expect(getMigrationStatus([])).toEqual({
      total: 0,
      executed: 0,
      pending: 0,
      recent10: [],
      failures: [],
    });
    // @ts-expect-error 故意传入 null 测试防御
    expect(getMigrationStatus(null).total).toBe(0);
    // @ts-expect-error 故意传入 undefined 测试防御
    expect(getMigrationStatus(undefined).executed).toBe(0);
  });

  it('统计 executed / pending / failed 计数', () => {
    const list = [
      desc('001_init.sql', 'executed', '2026-10-01T08:00:00Z'),
      desc('002_user.sql', 'executed', '2026-10-02T08:00:00Z'),
      desc('003_order.sql', 'pending'),
      desc('004_audit.sql', 'failed', undefined, '语法错误'),
    ];
    const s = getMigrationStatus(list);
    expect(s.total).toBe(4);
    expect(s.executed).toBe(2);
    // failed 不计入 pending，也不计入 executed
    expect(s.pending).toBe(1);
    expect(s.failures).toHaveLength(1);
    expect(s.failures[0].version).toBe('004_audit.sql');
    expect(s.failures[0].error).toBe('语法错误');
  });

  it('recent10 按 executedAt 倒序取前 10', () => {
    const list: MigrationDescriptor[] = [];
    for (let i = 1; i <= 12; i++) {
      list.push(desc(`00${i}_x.sql`, 'executed', `2026-10-${String(i).padStart(2, '0')}T08:00:00Z`));
    }
    const s = getMigrationStatus(list);
    expect(s.recent10).toHaveLength(10);
    // 最新的 10-12 号在最前
    expect(s.recent10[0].version).toBe('0012_x.sql');
    expect(s.recent10[9].version).toBe('003_x.sql');
  });

  it('无 executedAt 的已执行项不进入 recent10', () => {
    const list = [desc('001_a.sql', 'executed'), desc('002_b.sql', 'pending')];
    const s = getMigrationStatus(list);
    expect(s.executed).toBe(1);
    expect(s.recent10).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* runPendingMigrations                                                */
/* ------------------------------------------------------------------ */

describe('runPendingMigrations', () => {
  it('空 pending → 空结果，不调用 runner', async () => {
    let called = 0;
    const runner = async () => {
      called++;
    };
    expect(await runPendingMigrations([], runner)).toEqual([]);
    expect(called).toBe(0);
  });

  it('runner 非函数 → 空结果', async () => {
    // @ts-expect-error 故意传入非函数
    expect(await runPendingMigrations([desc('001.sql', 'pending')], null)).toEqual([]);
  });

  it('全部成功 → 每条 success=true，按顺序执行', async () => {
    const order: string[] = [];
    const runner = async (m: MigrationDescriptor) => {
      order.push(m.version);
    };
    const pending = [desc('001_a.sql', 'pending'), desc('002_b.sql', 'pending')];
    const results = await runPendingMigrations(pending, runner);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
    expect(results[0].version).toBe('001_a.sql');
    expect(results[1].version).toBe('002_b.sql');
    expect(order).toEqual(['001_a.sql', '002_b.sql']);
    // 每条都有 ranAt / durationMs
    for (const r of results) {
      expect(typeof r.ranAt).toBe('string');
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('部分失败 → 不中断后续迁移，错误被收集', async () => {
    const pending = [
      desc('001_a.sql', 'pending'),
      desc('002_b.sql', 'pending'), // 失败
      desc('003_c.sql', 'pending'), // 仍会执行
    ];
    const runner = async (m: MigrationDescriptor) => {
      if (m.version === '002_b.sql') {
        throw new Error('SQL 语法错误');
      }
    };
    const results = await runPendingMigrations(pending, runner);

    expect(results).toHaveLength(3);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBe('SQL 语法错误');
    // 关键：第三条仍被执行
    expect(results[2].success).toBe(true);
  });

  it('runner 抛出非 Error 对象 → 错误信息字符串化', async () => {
    const runner = async () => {
      throw 'string-error';
    };
    const results = await runPendingMigrations([desc('001.sql', 'pending')], runner);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe('string-error');
  });
});

/* ------------------------------------------------------------------ */
/* 进程内失败登记                                                       */
/* ------------------------------------------------------------------ */

describe('失败登记 registry', () => {
  it('recordMigrationFailure → listMigrationFailures 可读出', () => {
    recordMigrationFailure(desc('001.sql', 'pending', undefined, '连接超时'));
    const list = listMigrationFailures();
    expect(list).toHaveLength(1);
    expect(list[0].version).toBe('001.sql');
    expect(list[0].status).toBe('failed');
    expect(list[0].error).toBe('连接超时');
  });

  it('同版本号去重：后登记的覆盖旧记录', () => {
    recordMigrationFailure(desc('001.sql', 'pending', undefined, '第一次错'));
    recordMigrationFailure(desc('001.sql', 'pending', undefined, '第二次错'));
    const list = listMigrationFailures();
    expect(list).toHaveLength(1);
    expect(list[0].error).toBe('第二次错');
  });

  it('空 desc / 无 version → 忽略', () => {
    // @ts-expect-error 故意传入空
    recordMigrationFailure(null);
    // @ts-expect-error 故意传入无 version
    recordMigrationFailure({ filename: 'x.sql' });
    expect(listMigrationFailures()).toEqual([]);
  });

  it('clearMigrationFailures 清空登记', () => {
    recordMigrationFailure(desc('001.sql', 'pending', undefined, 'err'));
    expect(listMigrationFailures()).toHaveLength(1);
    clearMigrationFailures();
    expect(listMigrationFailures()).toEqual([]);
  });
});
