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
  type NurseCareOutcome,
  type NurseCareRecord,
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
