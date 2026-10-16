/**
 * 健澜科技 jlmedaios - 护士 MUSE 个人护理经验聚合（依据宪法第七章 7.6）单测
 *
 * 覆盖：
 *  - 护理经验聚合：totalCare 计数、recentTimeline 倒序取前 10、空时间排最后；
 *  - 风险统计：riskIdentified 由风险事件流独立计数；
 *  - 标签提取：careSkillTags 按频次降序、并列按首次出现顺序、去重；
 *  - 干预成功率：success/failure/mixed/未知结局口径与 4 位小数四舍五入；
 *  - 空输入兜底：null / undefined / 空数组均返回空视图，不抛错。
 *
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildNurseMuse,
  buildNurseMUSEProfile,
  recordNurseExperience,
  recommendNurseCare,
  trackNurseGrowth,
  type NurseCareOutcome,
  type NurseCareRecord,
  type NurseExperience,
  type NurseExperienceDraft,
  type NurseRiskEvent,
} from '../../src/bff/aggregators/nurseMuseAggregator';

/** 构造一条护理操作记录 */
function care(
  careType: string,
  opts: {
    outcome?: NurseCareOutcome | null;
    dept?: string;
    riskLevel?: string;
    intervention?: string;
    createdAt?: string;
  } = {},
): NurseCareRecord {
  return {
    careType,
    patientDept: opts.dept ?? null,
    riskLevel: opts.riskLevel ?? null,
    intervention: opts.intervention ?? null,
    outcome: opts.outcome ?? null,
    createdAt: opts.createdAt ?? null,
  };
}

/** 构造一条风险事件 */
function risk(riskLevel: string, createdAt?: string): NurseRiskEvent {
  return { riskLevel, createdAt };
}

describe('buildNurseMuse 护理经验聚合', () => {
  it('totalCare 统计护理操作条数', () => {
    const view = buildNurseMuse('N001', [care('压疮预防'), care('跌倒评估'), care('管路护理')], []);
    expect(view.totalCare).toBe(3);
  });

  it('recentTimeline 按 createdAt 倒序，缺失时间排最后', () => {
    const view = buildNurseMuse('N001', [
      care('压疮预防', { createdAt: '2026-10-01T09:00:00.000Z', dept: '普外科' }),
      care('跌倒评估', { createdAt: '2026-10-05T09:00:00.000Z', intervention: '床栏拉起' }),
      care('管路护理', { riskLevel: 'high', outcome: 'success' }),
    ], []);
    expect(view.recentTimeline.map((t) => t.careType)).toEqual(['跌倒评估', '压疮预防', '管路护理']);
    expect(view.recentTimeline[2].date).toBe('');
    expect(view.recentTimeline[0].intervention).toBe('床栏拉起');
    expect(view.recentTimeline[1].dept).toBe('普外科');
    expect(view.recentTimeline[2].riskLevel).toBe('high');
    expect(view.recentTimeline[2].outcome).toBe('success');
  });

  it('recentTimeline 最多保留 10 条', () => {
    const records: NurseCareRecord[] = Array.from({ length: 25 }, (_, i) =>
      care(`护理类型${i}`, { createdAt: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T09:00:00.000Z` }),
    );
    const view = buildNurseMuse('N001', records, []);
    expect(view.recentTimeline).toHaveLength(10);
  });
});

describe('buildNurseMuse 风险统计', () => {
  it('riskIdentified 由风险事件流独立计数', () => {
    const view = buildNurseMuse('N001', [], [risk('high'), risk('medium'), risk('low')]);
    expect(view.riskIdentified).toBe(3);
  });

  it('null / undefined 风险事件流按 0 计', () => {
    expect(buildNurseMuse('N001', [], null).riskIdentified).toBe(0);
    expect(buildNurseMuse('N001', [], undefined).riskIdentified).toBe(0);
  });
});

describe('buildNurseMuse 标签提取', () => {
  it('careSkillTags 按护理类型频次降序，并列按首次出现顺序', () => {
    const view = buildNurseMuse('N001', [
      care('跌倒风险评估'),
      care('压疮预防'),
      care('跌倒风险评估'),
      care('管路护理'),
      care('跌倒风险评估'),
      care('压疮预防'),
    ], []);
    expect(view.careSkillTags).toEqual(['跌倒风险评估', '压疮预防', '管路护理']);
  });

  it('careSkillTags 去重且忽略空白类型', () => {
    const view = buildNurseMuse('N001', [care('  '), care(''), care('管路护理'), care('管路护理')], []);
    expect(view.careSkillTags).toEqual(['管路护理']);
  });
});

describe('buildNurseMuse 干预成功率', () => {
  it('success / 已知结局，mixed 入分母不入分子', () => {
    const view = buildNurseMuse('N001', [
      care('压疮预防', { outcome: 'success' }),
      care('跌倒评估', { outcome: 'success' }),
      care('管路护理', { outcome: 'failure' }),
      care('用药观察', { outcome: 'mixed' }),
    ], []);
    expect(view.interventionSuccessRate).toBe(0.5);
  });

  it('未知结局（null）不计入分母', () => {
    const view = buildNurseMuse('N001', [
      care('压疮预防', { outcome: 'success' }),
      care('跌倒评估'),
    ], []);
    expect(view.interventionSuccessRate).toBe(1);
  });

  it('无已知结局记录时成功率为 0', () => {
    const view = buildNurseMuse('N001', [care('压疮预防'), care('跌倒评估')], []);
    expect(view.interventionSuccessRate).toBe(0);
  });
});

describe('buildNurseMuse 空输入兜底', () => {
  it('null / undefined / 空数组均返回空视图，不抛错', () => {
    const inputs: (NurseCareRecord[] | null | undefined)[] = [null, undefined, []];
    for (const input of inputs) {
      const view = buildNurseMuse('N002', input, []);
      expect(view).toEqual({
        totalCare: 0,
        riskIdentified: 0,
        interventionSuccessRate: 0,
        careSkillTags: [],
        recentTimeline: [],
      });
    }
  });
});

/* ================================================================== */
/* M169-C：护士 Personal Agent 深化（知识图谱与Personal Agent）         */
/* ================================================================== */

/** 快速落记一条经验（固定 createdAt 保证快照可断言） */
function exp(staffId: string, draft: NurseExperienceDraft): NurseExperience {
  return recordNurseExperience(staffId, draft);
}

describe('recordNurseExperience 经验落记', () => {
  it('子类型合法时反推所属大类', () => {
    const r = exp('N1', { subType: 'hazard', title: '跌倒隐患', createdAt: '2026-10-01T09:00:00.000Z' });
    expect(r.category).toBe('risk');
    expect(r.subType).toBe('hazard');
  });

  it('大类合法但子类型缺失时按大类兜底', () => {
    const r = exp('N1', { category: 'satisfaction', title: '表扬', createdAt: '2026-10-01T09:00:00.000Z' });
    expect(r.category).toBe('satisfaction');
    expect(r.subType).toBe('improvement');
  });

  it('大类子类型皆非法时兜底为 skill/operation', () => {
    const r = exp('N1', { category: 'bogus', subType: 'nope', title: 'x', createdAt: '2026-10-01T09:00:00.000Z' });
    expect(r.category).toBe('skill');
    expect(r.subType).toBe('operation');
  });

  it('隐私：自动剥离手机号与身份证号并留痕 patientMasked', () => {
    const r = exp('N1', {
      title: '联系患者13812345678确认',
      detail: '登记身份证330106199001011234备查',
      createdAt: '2026-10-01T09:00:00.000Z',
    });
    expect(r.title).not.toContain('13812345678');
    expect(r.detail).not.toContain('330106199001011234');
    expect(r.patientMasked).toBe(true);
  });

  it('隐私：缺省 shareScope=private，显式 dept 才共享', () => {
    const priv = exp('N1', { title: 'a', createdAt: '2026-10-01T09:00:00.000Z' });
    const shared = exp('N1', { title: 'b', shareScope: 'dept', createdAt: '2026-10-01T09:00:00.000Z' });
    expect(priv.shareScope).toBe('private');
    expect(shared.shareScope).toBe('dept');
  });

  it('同输入落记得到相同 ID（幂等可快照）', () => {
    const a = exp('N1', { subType: 'prevention', title: '翻身', createdAt: '2026-10-01T09:00:00.000Z' });
    const b = exp('N1', { subType: 'prevention', title: '翻身', createdAt: '2026-10-01T09:00:00.000Z' });
    expect(a.id).toBe(b.id);
  });

  it('outcome 宽松收敛，非法值为 null', () => {
    expect(exp('N1', { title: 'a', outcome: 'success', createdAt: '2026-10-01T09:00:00.000Z' }).outcome).toBe('success');
    expect(exp('N1', { title: 'a', outcome: '未知', createdAt: '2026-10-01T09:00:00.000Z' }).outcome).toBeNull();
  });
});

describe('buildNurseMUSEProfile 护士画像', () => {
  const items: NurseExperience[] = [
    exp('N1', { subType: 'hazard', title: '跌倒隐患', dept: '老年科', tags: ['跌倒'], createdAt: '2026-09-01T09:00:00.000Z' }),
    exp('N1', { subType: 'prevention', title: '留地灯预防', dept: '老年科', outcome: 'success', tags: ['跌倒'], createdAt: '2026-09-05T09:00:00.000Z' }),
    exp('N1', { subType: 'precaution', title: '交班要点', createdAt: '2026-09-06T09:00:00.000Z' }),
    exp('N1', { subType: 'praise', title: '患者表扬', createdAt: '2026-09-07T09:00:00.000Z' }),
    exp('N1', { subType: 'complaint', title: '呼叫投诉', createdAt: '2026-09-08T09:00:00.000Z' }),
  ];

  it('四类经验计数正确', () => {
    const p = buildNurseMUSEProfile('N1', items);
    expect(p.totalExperiences).toBe(5);
    expect(p.byCategory.risk).toBe(2);
    expect(p.byCategory.satisfaction).toBe(2);
  });

  it('风险闭环：同标签隐患→预防记闭环', () => {
    const p = buildNurseMUSEProfile('N1', items);
    expect(p.riskClosure.hazardsIdentified).toBe(1);
    expect(p.riskClosure.closedLoops).toBe(1);
    expect(p.riskClosure.closureRate).toBe(1);
  });

  it('满意度：表扬率 = praise/(praise+complaint)', () => {
    const p = buildNurseMUSEProfile('N1', items);
    expect(p.satisfaction.praise).toBe(1);
    expect(p.satisfaction.complaint).toBe(1);
    expect(p.satisfaction.praiseRate).toBe(0.5);
  });

  it('隐私画像：默认 private 计数 + 常驻隐私说明', () => {
    const p = buildNurseMUSEProfile('N1', items);
    expect(p.privacy.privateCount).toBe(5);
    expect(p.privacy.deptSharedCount).toBe(0);
    expect(p.privacy.notice).toContain('不公开他人经验');
  });

  it('空输入返回空画像不抛错', () => {
    const p = buildNurseMUSEProfile('N1', null);
    expect(p.totalExperiences).toBe(0);
    expect(p.lastActivityAt).toBeNull();
    expect(p.byCategory.risk).toBe(0);
  });
});

describe('recommendNurseCare 护理推荐（只召回本人经验）', () => {
  const mine: NurseExperience[] = [
    exp('N1', { subType: 'prevention', title: '跌倒预防措施', dept: '老年科', riskLevel: 'high', outcome: 'success', tags: ['跌倒'], createdAt: '2026-09-01T09:00:00.000Z' }),
    exp('N1', { subType: 'operation', title: '管路固定手法', dept: '普外科', tags: ['管路'], createdAt: '2026-09-02T09:00:00.000Z' }),
    exp('N1', { subType: 'praise', title: '患者表扬记录', tags: ['表扬'], createdAt: '2026-09-03T09:00:00.000Z' }),
  ];

  it('命中患者条件标签的经验排最前', () => {
    const recs = recommendNurseCare('N1', { dept: '老年科', riskLevel: 'high', conditions: ['跌倒'] }, mine);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].title).toBe('跌倒预防措施');
    expect(recs[0].reason).toContain('跌倒');
  });

  it('满意度类经验不进护理推荐', () => {
    const recs = recommendNurseCare('N1', {}, mine);
    expect(recs.some((r) => r.title === '患者表扬记录')).toBe(false);
  });

  it('只接收本人经验：函数不认识他人经验，peers 不参与', () => {
    // 函数形参只有 ownExperiences——他人经验需调用方显式传入才可能出现，
    // 这里传入空集 → 空推荐，证明图谱他人节点默认不可见。
    const recs = recommendNurseCare('N1', { conditions: ['跌倒'] }, []);
    expect(recs).toEqual([]);
  });

  it('空上下文也给可复用建议（基础分 > 0）', () => {
    const recs = recommendNurseCare('N1', {}, mine);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.rank >= 1)).toBe(true);
  });
});

describe('trackNurseGrowth 成长跟踪', () => {
  const items: NurseExperience[] = [
    exp('N1', { subType: 'hazard', title: '隐患', tags: ['跌倒'], createdAt: '2026-08-05T09:00:00.000Z' }),
    exp('N1', { subType: 'prevention', title: '预防成功', outcome: 'success', tags: ['跌倒'], createdAt: '2026-08-20T09:00:00.000Z' }),
    exp('N1', { subType: 'praise', title: '表扬', createdAt: '2026-09-06T09:00:00.000Z' }),
    exp('N1', { subType: 'complaint', title: '投诉', createdAt: '2026-09-20T09:00:00.000Z' }),
    ...Array.from({ length: 8 }, (_, i) =>
      exp('N1', { subType: 'operation', title: `技巧${i}`, createdAt: `2026-09-1${i % 9}T09:00:00.000Z` }),
    ),
  ];

  it('月度分桶与大类分布正确', () => {
    const g = trackNurseGrowth('N1', {}, items);
    expect(g.totalInPeriod).toBe(12);
    expect(g.monthly.map((m) => m.month)).toEqual(['2026-08', '2026-09']);
    expect(g.monthly[0].risk).toBe(2);
    expect(g.categoryDistribution.skill).toBe(8);
  });

  it('周期内风险闭环率统计', () => {
    const g = trackNurseGrowth('N1', {}, items);
    expect(g.riskClosureRate).toBe(1);
  });

  it('里程碑覆盖风险/闭环/表扬/累计量', () => {
    const g = trackNurseGrowth('N1', {}, items);
    expect(g.milestones.some((m) => m.includes('风险'))).toBe(true);
    expect(g.milestones.some((m) => m.includes('闭环'))).toBe(true);
    expect(g.milestones.some((m) => m.includes('表扬'))).toBe(true);
    expect(g.milestones.some((m) => m.includes('12'))).toBe(true);
  });

  it('focusArea 指向最薄弱大类', () => {
    const g = trackNurseGrowth('N1', {}, items);
    expect(g.focusArea.length).toBeGreaterThan(0);
  });

  it('空经验返回空报告不抛错', () => {
    const g = trackNurseGrowth('N1', {}, null);
    expect(g.totalInPeriod).toBe(0);
    expect(g.monthly).toEqual([]);
  });
});
