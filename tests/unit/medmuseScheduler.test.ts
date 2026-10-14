/**
 * 健澜科技 jlmedaios - MEDMUSE 定时任务调度器纯函数单测
 *
 * 仅覆盖触发时间计算 msUntilNextAt（无 I/O、确定性）：
 * 当天未到点 / 当天已过点 / 整点边界 / 三个触发时点（7/14/20）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import { msUntilNextAt } from '../../src/bff/jobs/medmuseScheduler';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** 构造本地时区当日 hh:mm:ss 的 Date */
function at(hour: number, minute = 0, second = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, second, 0);
  return d;
}

describe('msUntilNextAt 触发时间计算', () => {
  it('当天 7:00 之前 -> 当天 7:00 的毫秒数', () => {
    // 06:30 -> 30 分钟后到 7:00
    const delay = msUntilNextAt(at(6, 30), 7);
    expect(delay).toBe(30 * 60_000);
    expect(delay).toBeGreaterThan(0);
  });

  it('当天 7:00 之后 -> 明天 7:00 的毫秒数', () => {
    // 08:00 -> 23 小时后（次日 7:00）
    const delay = msUntilNextAt(at(8, 0), 7);
    expect(delay).toBe(23 * HOUR_MS);
  });

  it('恰好等于触发整点 -> 不重复触发今天，顺延到明天（24h）', () => {
    const delay = msUntilNextAt(at(14, 0), 14);
    expect(delay).toBe(DAY_MS);
  });

  it('早 1 毫秒过整点 -> 已过点，顺延到明天', () => {
    const now = at(20, 0, 0);
    now.setMilliseconds(1);
    const delay = msUntilNextAt(now, 20);
    expect(delay).toBe(DAY_MS - 1);
  });

  it('三个触发时点（7/14/20）返回值恒在 (0, 24h] 区间', () => {
    for (const hour of [7, 14, 20]) {
      for (const probe of [0, 3, 6, 6, 9, 12, 14, 17, 20, 23, 23, 59]) {
        const delay = msUntilNextAt(at(probe), hour);
        expect(delay).toBeGreaterThan(0);
        expect(delay).toBeLessThanOrEqual(DAY_MS);
      }
    }
  });

  it('14:00 扫描任务：13:00 触发 -> 1 小时后', () => {
    expect(msUntilNextAt(at(13, 0), 14)).toBe(HOUR_MS);
  });

  it('20:00 待办任务：19:30 触发 -> 30 分钟后', () => {
    expect(msUntilNextAt(at(19, 30), 20)).toBe(30 * 60_000);
  });
});
