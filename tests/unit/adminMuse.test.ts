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
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ADMIN_ROI_RANK_LIMIT,
  ADMIN_TIMELINE_LIMIT,
  buildAdminMuse,
  computeROI,
  type AdminDecision,
} from '../../src/bff/aggregators/adminMuseAggregator.js';
import { resolveMuseAdminTarget } from '../../src/bff/routes/museAdmin.js';
import {
  __resetAdminExperienceStore,
  benchmarkAdminDecision,
  buildAdminMUSEProfile,
  recordAdminExperience,
  recommendAdminDecision,
} from '../../src/bff/aggregators/adminMuseAggregator.js';

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

/* ================================================================== */
/* M169-D 知识图谱与 Personal Agent：画像 / 沉淀 / 推荐 / 对标          */
/* ================================================================== */

describe('recordAdminExperience - 管理经验沉淀归一', () => {
  beforeEach(() => __resetAdminExperienceStore());

  it('非法类别→management，效果截断到[-2,2]，标签去重保序', () => {
    const rec = recordAdminExperience('s1', {
      category: 'not-a-category',
      subType: '流程优化',
      situation: '门诊拥堵',
      action: '分时段预约',
      outcome: 'success',
      effectiveness: 9.9,
      reflection: '先调号源',
      tags: '门诊, 门诊、预约',
    });
    expect(rec.category).toBe('management');
    expect(rec.outcome).toBe('success');
    expect(rec.effectiveness).toBe(2);
    expect(rec.tags).toEqual(['门诊', '预约']);
    expect(rec.staffId).toBe('s1');
    expect(rec.id).toBeTruthy();
  });

  it('脏输入兜底：非三态结局→mixed，非数效果→0，空标签→[]，缺省子类', () => {
    const rec = recordAdminExperience('s2', {
      category: 'crisis',
      outcome: 'weird',
      effectiveness: 'abc',
      tags: null,
    });
    expect(rec.outcome).toBe('mixed');
    expect(rec.effectiveness).toBe(0);
    expect(rec.tags).toEqual([]);
    expect(rec.subType).toBe('危机处置');
  });

  it('同一员工多次沉淀可累计，互不串号', () => {
    recordAdminExperience('s3', { category: 'crisis', effectiveness: 1 });
    recordAdminExperience('s3', { category: 'crisis', effectiveness: 1 });
    recordAdminExperience('other', { category: 'management', effectiveness: 1 });
    const p = buildAdminMUSEProfile('s3');
    expect(p.totalExperiences).toBe(2);
    expect(p.byCategory.find((c) => c.category === 'crisis')?.count).toBe(2);
  });
});

describe('buildAdminMUSEProfile - 管理画像', () => {
  beforeEach(() => __resetAdminExperienceStore());

  it('冷启动：无沉淀返回零值画像，isColdStart=true，不抛错', () => {
    const p = buildAdminMUSEProfile('nobody');
    expect(p.isColdStart).toBe(true);
    expect(p.totalExperiences).toBe(0);
    expect(p.growthScore).toBe(0);
    expect(p.byCategory.every((c) => c.count === 0)).toBe(true);
  });

  it('画像：擅长打法取 effectiveness≥+1，跟头取 failure，盲区按规则识别', () => {
    recordAdminExperience('dean', { category: 'crisis', subType: '舆情', situation: '短视频发酵', action: '2小时官方说明', outcome: 'success', effectiveness: 1.5, reflection: '先认账' });
    recordAdminExperience('dean', { category: 'crisis', subType: '舆情', situation: '类似舆情', action: '增开晚门诊', outcome: 'success', effectiveness: 1.0 });
    recordAdminExperience('dean', { category: 'operations_decision', subType: '采购', situation: '检验慢', action: '只买设备不改造流程', outcome: 'failure', effectiveness: -1.2, reflection: '先做流程测绘' });
    recordAdminExperience('dean', { category: 'management', subType: '团队', situation: '护士离职', action: '弹性排班', outcome: 'mixed', effectiveness: 0.3, reflection: '钱和关怀都要' });

    const p = buildAdminMUSEProfile('dean');
    expect(p.totalExperiences).toBe(4);
    expect(p.growthScore).toBeGreaterThan(0);
    expect(p.growthScore).toBeLessThanOrEqual(100);
    expect(p.crisisSteadiness).toBe(1);
    expect(p.strengths.length).toBe(2);
    expect(p.strengths[0].effectiveness).toBeGreaterThanOrEqual(p.strengths[1].effectiveness);
    expect(p.pitfalls.length).toBe(1);
    expect(p.pitfalls[0].action).toContain('只买设备');
    expect(p.gaps.some((g) => g.category === 'resource_allocation')).toBe(true);
  });
});

describe('recommendAdminDecision - 决策推荐', () => {
  beforeEach(() => __resetAdminExperienceStore());

  it('冷启动：无战例返回基线打法，coldStart=true，confidence=0', () => {
    const r = recommendAdminDecision('cold', { category: 'crisis', situation: '舆情发酵' });
    expect(r.coldStart).toBe(true);
    expect(r.confidence).toBe(0);
    expect(r.recommendedActions[0].action).toBeTruthy();
    expect(r.summary).toContain('还没有');
  });

  it('召回本人成过的动作，并指出栽过的坑，结论具体不空喊', () => {
    recordAdminExperience('dean', { category: 'crisis', subType: '舆情', situation: '挂号难短视频本地发酵', action: '2小时官方说明+次日增开晚门诊', outcome: 'success', effectiveness: 1.4, reflection: '速度比措辞重要', tags: ['舆情', '短视频'] });
    recordAdminExperience('dean', { category: 'crisis', subType: '舆情', situation: '类似网络投诉扩散', action: '只发声明不解决实际问题', outcome: 'failure', effectiveness: -1.3, reflection: '不能光辩解', tags: ['舆情'] });

    const r = recommendAdminDecision('dean', { category: 'crisis', subType: '舆情', situation: '挂号难短视频又发酵了', tags: ['舆情', '短视频'] });
    expect(r.coldStart).toBe(false);
    expect(r.matchedCases.length).toBeGreaterThan(0);
    expect(r.recommendedActions.length).toBeGreaterThan(0);
    expect(r.recommendedActions[0].action).toContain('官方说明');
    expect(r.pitfallsToAvoid.some((p) => p.action.includes('只发声明'))).toBe(true);
    expect(r.summary).toContain('官方说明');
    expect(r.summary).not.toContain('建议关注');
    expect(r.confidence).toBeGreaterThan(0);
  });
});

describe('benchmarkAdminDecision - 效果对标', () => {
  beforeEach(() => __resetAdminExperienceStore());

  it('本次远高于本人同类均值 → above_par，结论建议固化 SOP', () => {
    recordAdminExperience('dean', { category: 'management', subType: '流程优化', situation: '排队', action: '并行窗口', outcome: 'mixed', effectiveness: 0.2 });
    recordAdminExperience('dean', { category: 'management', subType: '流程优化', situation: '排队', action: '并行窗口v2', outcome: 'mixed', effectiveness: 0.4 });

    const b = benchmarkAdminDecision(
      'dean',
      { category: 'management', subType: '流程优化' },
      { effectiveness: 1.5 },
    );
    expect(b.sampleSize).toBe(2);
    expect(b.thisEffectiveness).toBe(1.5);
    expect(b.ownCategoryAvg).toBeCloseTo(0.3, 5);
    expect(b.verdict).toBe('above_par');
    expect(b.reflectionPrompt).toContain('固化');
  });

  it('本次远低于本人同类均值 → below_par，delta 为负', () => {
    recordAdminExperience('dean', { category: 'resource_allocation', subType: '床位', situation: 'ICU紧张', action: '日清调度会', outcome: 'success', effectiveness: 1.2 });
    recordAdminExperience('dean', { category: 'resource_allocation', subType: '床位', situation: 'ICU紧张', action: '日清调度会', outcome: 'success', effectiveness: 1.0 });

    const b = benchmarkAdminDecision(
      'dean',
      { category: 'resource_allocation' },
      { effectiveness: -1.0 },
    );
    expect(b.verdict).toBe('below_par');
    expect(b.deltaVsOwn).toBeLessThan(0);
    expect(b.reflectionPrompt).toContain('低于');
  });

  it('首次记录无基线 → sampleSize=0，仍给可执行结论不抛错', () => {
    const b = benchmarkAdminDecision('fresh', { category: 'crisis' }, { effectiveness: 0.5 });
    expect(b.sampleSize).toBe(0);
    expect(b.verdict).toBe('on_par');
    expect(b.reflectionPrompt).toContain('第 1 次');
  });

  it('趋势字段必为三态之一', () => {
    recordAdminExperience('dean', { category: 'operations_decision', effectiveness: 0 });
    recordAdminExperience('dean', { category: 'operations_decision', effectiveness: 0 });
    recordAdminExperience('dean', { category: 'operations_decision', effectiveness: 0 });
    const b = benchmarkAdminDecision('dean', { category: 'operations_decision' }, { effectiveness: 0.1 });
    expect(['improving', 'stable', 'declining']).toContain(b.trend);
  });
});
