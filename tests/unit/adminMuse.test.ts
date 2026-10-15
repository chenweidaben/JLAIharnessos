/**
 * 健澜科技 jlmedaios - 管理员 MUSE 决策经验聚合器单测（M116-C）
 *
 * 覆盖：
 *  - 决策经验聚合：totalDecisions 计数 / avgMetricImprovement 仅统计有度量决策 /
 *                 roiRanking 按 ROI 降序截断 / decisionTimeline 按时间倒序截断；
 *  - 效果统计：success=+metric、mixed=+metric*0.5、failure=-metric 的 ROI 加权口径；
 *  - ROI 计算：computeROI 三态 + null 度量兜底 + 2 位小数四舍五入；
 *  - outcomes 覆盖：事后实测 measuredImprovement 按 decisionId 优先于 result_metric；
 *  - 角色差异：resolveMuseAdminTarget——非 admin 拒绝 / admin 看自己 / admin 看他人；
 *  - 空数据兜底：null / undefined / 空数组一律零值视图，绝不抛错。
 *
 * 注意：纯函数测试，不连接 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  ADMIN_ROI_RANK_LIMIT,
  ADMIN_TIMELINE_LIMIT,
  buildAdminMuse,
  computeROI,
  type AdminDecision,
} from '../../src/bff/aggregators/adminMuseAggregator.js';
import { resolveMuseAdminTarget } from '../../src/bff/routes/museAdmin.js';

/** 造一条管理决策；offsetDays 天前 */
function mkDecision(
  offsetDays: number,
  outcome: AdminDecision['outcome'],
  resultMetric: number | null,
  action = '管理动作',
  decisionType = '预算分配',
  id?: string,
): AdminDecision {
  const base = new Date('2026-10-15T12:00:00.000Z');
  base.setDate(base.getDate() - offsetDays);
  return {
    id: id ?? `d${offsetDays}_${outcome}_${String(resultMetric)}`,
    adminId: 'admin_1',
    decisionType,
    context: '脱敏上下文',
    action,
    resultMetric,
    outcome,
    createdAt: base.toISOString(),
  };
}

describe('computeROI - 三态加权', () => {
  it('success：ROI = +resultMetric', () => {
    expect(computeROI({ resultMetric: 15, outcome: 'success' })).toBe(15);
  });

  it('mixed：ROI = +resultMetric * 0.5', () => {
    expect(computeROI({ resultMetric: 10, outcome: 'mixed' })).toBe(5);
  });

  it('failure：ROI = -resultMetric（决策未达预期 / 恶化计负回报）', () => {
    expect(computeROI({ resultMetric: 8, outcome: 'failure' })).toBe(-8);
  });

  it('resultMetric 为 null（未量化）：ROI = 0', () => {
    expect(computeROI({ resultMetric: null, outcome: 'success' })).toBe(0);
  });

  it('四舍五入到 2 位小数：1/3 → 0.33', () => {
    expect(computeROI({ resultMetric: 0.6666, outcome: 'mixed' })).toBe(0.33);
  });
});

describe('buildAdminMuse - 决策经验聚合', () => {
  it('totalDecisions 统计清洗后决策条数', () => {
    const view = buildAdminMuse('admin_1', [
      mkDecision(0, 'success', 10),
      mkDecision(1, 'failure', 4),
      mkDecision(2, 'mixed', 6),
    ], []);
    expect(view.totalDecisions).toBe(3);
  });

  it('avgMetricImprovement：仅统计有度量决策，取均值 2 位小数', () => {
    const view = buildAdminMuse('admin_1', [
      mkDecision(0, 'success', 10),
      mkDecision(1, 'success', 20),
      mkDecision(2, 'failure', null), // 未量化，不参与均值
    ], []);
    expect(view.avgMetricImprovement).toBe(15);
  });

  it('roiRanking 按 ROI 降序：success 正 / failure 负，混合居中', () => {
    const view = buildAdminMuse('admin_1', [
      mkDecision(5, 'failure', 10, '失败决策', '设备采购', 'f1'), // ROI=-10
      mkDecision(0, 'success', 20, '最佳决策', '流程再造', 's1'), // ROI=+20
      mkDecision(2, 'mixed', 10, '混合决策', '人事调度', 'm1'), // ROI=+5
    ], []);
    expect(view.roiRanking[0].id).toBe('s1');
    expect(view.roiRanking[0].roi).toBe(20);
    expect(view.roiRanking[1].id).toBe('m1');
    expect(view.roiRanking[1].roi).toBe(5);
    expect(view.roiRanking[2].id).toBe('f1');
    expect(view.roiRanking[2].roi).toBe(-10);
  });

  it('decisionTimeline 按时间倒序（最近在前），截断 10 条', () => {
    const decisions = Array.from({ length: 15 }, (_, i) =>
      mkDecision(i, 'success', i + 1, `动作#${i}`, '流程再造', `t${i}`),
    );
    const view = buildAdminMuse('admin_1', decisions, []);
    expect(view.decisionTimeline.length).toBe(ADMIN_TIMELINE_LIMIT);
    expect(view.decisionTimeline[0].action).toBe('动作#0'); // offset=0 最近
  });

  it('roiRanking 截断为 10 条', () => {
    const decisions = Array.from({ length: 20 }, (_, i) =>
      mkDecision(i, 'success', i + 1, `动作#${i}`, '流程再造', `r${i}`),
    );
    const view = buildAdminMuse('admin_1', decisions, []);
    expect(view.roiRanking.length).toBe(ADMIN_ROI_RANK_LIMIT);
  });
});

describe('buildAdminMuse - outcomes 事后实测覆盖', () => {
  it('outcomes 按 decisionId 覆盖 result_metric，ROI 与均值以实测为准', () => {
    const view = buildAdminMuse(
      'admin_1',
      [
        mkDecision(0, 'success', 10, '旧预算', '预算分配', 'a1'), // DB 记 10
        mkDecision(1, 'success', 20, '旧流程', '流程再造', 'a2'), // DB 记 20
      ],
      [
        { decisionId: 'a1', measuredImprovement: 30 }, // 实测修正为 30
      ],
    );
    // a1 实测 30（success ROI=30），a2 仍用 20（ROI=20）
    expect(view.roiRanking[0].id).toBe('a1');
    expect(view.roiRanking[0].resultMetric).toBe(30);
    expect(view.roiRanking[0].roi).toBe(30);
    // 均值 = (30 + 20) / 2 = 25
    expect(view.avgMetricImprovement).toBe(25);
  });

  it('outcomes 中无效 decisionId / 非有限数：忽略但整体不崩', () => {
    const view = buildAdminMuse(
      'admin_1',
      [mkDecision(0, 'success', 10, '动作', '预算分配', 'a1')],
      // 故意喂「不存在的 decisionId」与 NaN 度量，验证纯函数侧防御
      [
        { decisionId: 'not-exist', measuredImprovement: 99 },
        { decisionId: 'a1', measuredImprovement: Number.NaN },
      ],
    );
    expect(view.roiRanking[0].resultMetric).toBe(10);
    expect(view.roiRanking[0].roi).toBe(10);
  });
});

describe('resolveMuseAdminTarget - 角色差异', () => {
  it('非 admin：拒绝（403 语义）', () => {
    const r = resolveMuseAdminTarget({ id: 'u1', roles: ['doctor'] }, null);
    expect('forbidden' in r).toBe(true);
  });

  it('admin 未传 staffId：看自己', () => {
    const r = resolveMuseAdminTarget({ id: 'admin_1', roles: ['admin'] }, null);
    expect('staffId' in r && r.staffId).toBe('admin_1');
  });

  it('admin 传 staffId：看他人（带教 / 复盘抽检）', () => {
    const r = resolveMuseAdminTarget({ id: 'admin_1', roles: ['admin'] }, 'director_2');
    expect('staffId' in r && r.staffId).toBe('director_2');
  });

  it('staffId 为空白串：视为看自己', () => {
    const r = resolveMuseAdminTarget({ id: 'admin_1', roles: ['admin'] }, '   ');
    expect('staffId' in r && r.staffId).toBe('admin_1');
  });
});

describe('buildAdminMuse - 空数据兜底', () => {
  it('全 null 入参：零值视图，绝不抛错', () => {
    const view = buildAdminMuse('admin_1', null, null);
    expect(view.totalDecisions).toBe(0);
    expect(view.avgMetricImprovement).toBe(0);
    expect(view.roiRanking).toEqual([]);
    expect(view.decisionTimeline).toEqual([]);
  });

  it('空数组入参：与 null 一致兜底', () => {
    const view = buildAdminMuse('admin_1', [], []);
    expect(view.totalDecisions).toBe(0);
    expect(view.roiRanking).toEqual([]);
  });

  it('结局为脏值：归一为 mixed，不崩', () => {
    const view = buildAdminMuse(
      'admin_1',
      // @ts-expect-error 故意喂脏数据，验证防御
      [{ id: 'x', adminId: 'a', decisionType: '预算', context: '', action: '脏', resultMetric: 10, outcome: 'weird', createdAt: '2026-10-10T00:00:00Z' }],
      [],
    );
    expect(view.roiRanking[0].outcome).toBe('mixed');
    // mixed: ROI = 10 * 0.5 = 5
    expect(view.roiRanking[0].roi).toBe(5);
  });
});
