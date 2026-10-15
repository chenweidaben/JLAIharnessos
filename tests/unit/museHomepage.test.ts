/**
 * 健澜科技 jlmedaios - 个人 MUSE 主页聚合器单测（M115-A）
 *
 * 覆盖：
 *  - 数据聚合：DB stats 优先口径 / successRate 四舍五入 / lessonCount 兜底 /
 *              weekNew 滚动 7 天窗口 / timeline 倒序截断 / growth30d 30 点累计；
 *  - 角色差异：resolveMuseTargetStaffId——本人默认 / admin 可看他人 /
 *              非 admin 传 staffId 被拒；
 *  - 空数据兜底：null / undefined / 空数组一律零值视图，绝不抛错。
 *
 * 注意：纯函数测试，不连接 PostgreSQL；时间由 nowIso 注入固定快照。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildMuseHomepage,
  MUSE_GROWTH_DAYS,
  MUSE_TIMELINE_LIMIT,
  type MuseHomeDecision,
} from '../../src/bff/aggregators/museHomepageAggregator.js';
import { resolveMuseTargetStaffId } from '../../src/bff/routes/museHome.js';

/** 固定「当前时间」：2026-10-15 12:00 UTC（本地 UTC+8 = 20:00，日期键 2026-10-15） */
const NOW = '2026-10-15T12:00:00.000Z';

/** 造一条 offsetDays 天前的决策（日期键落在 2026-10-15 - offsetDays） */
function mkDecision(
  offsetDays: number,
  outcome: MuseHomeDecision['outcome'],
  decision = '决策摘要',
  lesson?: string,
): MuseHomeDecision {
  const base = new Date('2026-10-15T12:00:00.000Z');
  base.setDate(base.getDate() - offsetDays);
  return {
    decision,
    outcome,
    createdAt: base.toISOString(),
    ...(lesson ? { lesson } : {}),
  };
}

describe('buildMuseHomepage - 数据聚合', () => {
  it('DB stats 优先于现场统计：totalDecisions / successCount / lessonCount 取 DB 值', () => {
    const view = buildMuseHomepage(
      { staffId: 's1', name: '陈维', role: 'doctor' },
      { totalDecisions: 50, successCount: 30, lessonCount: 7 },
      [mkDecision(0, 'success'), mkDecision(1, 'failure', '桥接', '桥接过晚')],
      NOW,
    );
    expect(view.totalDecisions).toBe(50);
    expect(view.successRate).toBe(0.6); // 30/50，4 位小数
    expect(view.lessonCount).toBe(7); // DB 值优先，不用现场数到的 1
  });

  it('无 DB stats 时现场兜底：成功率 = success/total', () => {
    const view = buildMuseHomepage(
      { staffId: 's1', name: '陈维', role: 'doctor' },
      null,
      [
        mkDecision(0, 'success'),
        mkDecision(1, 'success'),
        mkDecision(2, 'failure'),
        mkDecision(3, 'mixed'),
        mkDecision(4, 'failure', '留观', '留观时长不足'),
      ],
      NOW,
    );
    expect(view.totalDecisions).toBe(5);
    expect(view.successRate).toBe(0.4); // 2/5
    expect(view.lessonCount).toBe(1); // 仅 1 条 lesson 非空
  });

  it('成功率四舍五入到 4 位小数', () => {
    const decisions = [
      mkDecision(0, 'success'),
      mkDecision(1, 'failure'),
    ];
    const view = buildMuseHomepage(null, { totalDecisions: 3, successCount: 1 }, decisions, NOW);
    expect(view.successRate).toBe(0.3333);
  });

  it('weekNew 只数滚动 7 天窗口内的决策', () => {
    const decisions = [
      mkDecision(0, 'success'), // 本周
      mkDecision(3, 'failure'), // 本周
      mkDecision(6, 'success'), // 本周边界内
      mkDecision(8, 'mixed'), // 窗口外
      mkDecision(20, 'success'), // 窗口外
    ];
    const view = buildMuseHomepage(null, null, decisions, NOW);
    expect(view.weekNew).toBe(3);
  });

  it('timeline 按时间倒序并截断为 8 条', () => {
    const decisions = Array.from({ length: 12 }, (_, i) =>
      mkDecision(i, i % 2 === 0 ? 'success' : 'failure', `决策#${i}`),
    );
    const view = buildMuseHomepage(null, null, decisions, NOW);
    expect(view.timeline.length).toBe(MUSE_TIMELINE_LIMIT);
    // 倒序：第一条是 offset=0（最近）
    expect(view.timeline[0].decision).toBe('决策#0');
    // lesson 非空才输出 lesson 字段
    expect(view.timeline[0].lesson).toBeUndefined();
  });

  it('timeline 结局归一：非三态值归为 mixed', () => {
    const view = buildMuseHomepage(
      null,
      null,
      // @ts-expect-error 故意喂脏数据，验证防御
      [{ decision: '脏数据', outcome: 'weird', createdAt: NOW }],
      NOW,
    );
    expect(view.timeline[0].outcome).toBe('mixed');
  });

  it('growth30d 恒为 30 点、逐日累计递增、终点=窗口内决策总数', () => {
    const decisions = [
      mkDecision(0, 'success'),
      mkDecision(2, 'failure'),
      mkDecision(2, 'success'),
      mkDecision(15, 'mixed'),
    ];
    const view = buildMuseHomepage(null, null, decisions, NOW);
    expect(view.growth30d.length).toBe(MUSE_GROWTH_DAYS);
    // 单调不减
    for (let i = 1; i < view.growth30d.length; i += 1) {
      expect(view.growth30d[i].count).toBeGreaterThanOrEqual(view.growth30d[i - 1].count);
    }
    expect(view.growth30d[view.growth30d.length - 1].count).toBe(4);
    // 最后一点日期键 = 今天
    expect(view.growth30d[view.growth30d.length - 1].date).toBe('2026-10-15');
  });
});

describe('resolveMuseTargetStaffId - 角色差异', () => {
  it('未传 staffId：普通员工看自己', () => {
    const r = resolveMuseTargetStaffId({ id: 'u_1001', roles: ['doctor'] }, null);
    expect('staffId' in r && r.staffId).toBe('u_1001');
  });

  it('普通员工传 staffId：拒绝（403 语义）', () => {
    const r = resolveMuseTargetStaffId({ id: 'u_1001', roles: ['doctor'] }, 'u_999');
    expect('forbidden' in r).toBe(true);
  });

  it('admin 传 staffId：允许看他人', () => {
    const r = resolveMuseTargetStaffId({ id: 'u_1001', roles: ['admin'] }, 'u_999');
    expect('staffId' in r && r.staffId).toBe('u_999');
  });

  it('staffId 为空白串：视为看自己', () => {
    const r = resolveMuseTargetStaffId({ id: 'u_1001', roles: ['doctor'] }, '   ');
    expect('staffId' in r && r.staffId).toBe('u_1001');
  });
});

describe('buildMuseHomepage - 空数据兜底', () => {
  it('全 null 入参：零值视图 + 30 点平线，绝不抛错', () => {
    const view = buildMuseHomepage(null, null, null, NOW);
    expect(view.totalDecisions).toBe(0);
    expect(view.successRate).toBe(0);
    expect(view.lessonCount).toBe(0);
    expect(view.weekNew).toBe(0);
    expect(view.timeline).toEqual([]);
    expect(view.growth30d.length).toBe(MUSE_GROWTH_DAYS);
    expect(view.growth30d.every((p) => p.count === 0)).toBe(true);
  });

  it('空数组入参：与 null 一致兜底', () => {
    const view = buildMuseHomepage(undefined, {}, [], NOW);
    expect(view.totalDecisions).toBe(0);
    expect(view.timeline).toEqual([]);
  });

  it('决策列表含非法时间：weekNew/timeline/growth 忽略该条但整体不崩', () => {
    const view = buildMuseHomepage(
      null,
      null,
      [
        mkDecision(0, 'success'),
        { decision: '坏时间', outcome: 'success', createdAt: 'not-a-date' },
      ],
      NOW,
    );
    expect(view.weekNew).toBe(1);
    expect(view.timeline.length).toBe(2);
    expect(view.timeline[1].date).toBe('未知日期');
  });
});
