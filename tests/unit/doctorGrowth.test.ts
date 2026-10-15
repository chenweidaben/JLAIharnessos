/**
 * 健澜科技 jlmedaios - M119-A 医生成长档案聚合器单测
 *
 * 覆盖：
 *  - 成长计算：月度分桶（含空月补齐）、成功率口径（success/decisions）；
 *  - 趋势分析：有决策月份均分前后两段、加权成功率与 delta 方向；
 *  - 教训闭环：失败教训后续同 tag 成功记闭环、闭环率口径；
 *  - 专长标签与里程碑：频次排序、首决策/首成功/首教训；
 *  - 雷达图数据：关键词命中归一、无信号时中性基线。
 *
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildDoctorGrowthProfile,
  computeRadarScores,
  type GrowthDecision,
} from '../../src/bff/aggregators/doctorGrowthAggregator';

/** 构造一条决策：monthOffset 用固定 UTC 日期，避免时区漂移 */
function d(
  iso: string,
  outcome: 'success' | 'failure' | 'mixed',
  opts: { tag?: string; lesson?: string; specialty?: string } = {},
): GrowthDecision {
  return { at: iso, outcome, tag: opts.tag, lesson: opts.lesson, specialty: opts.specialty };
}

describe('buildDoctorGrowthProfile 成长计算', () => {
  it('月度分桶：含空月补齐，成功率 = success/decisions', () => {
    const decisions = [
      d('2026-01-05T09:00:00Z', 'success'),
      d('2026-01-20T09:00:00Z', 'success'),
      d('2026-02-08T09:00:00Z', 'failure'),
      d('2026-02-18T09:00:00Z', 'success'),
      d('2026-04-10T09:00:00Z', 'success'),
    ];
    const profile = buildDoctorGrowthProfile('S1', { start: '2026-01-01', end: '2026-06-30' }, decisions);

    // 1月~6月共 6 个点，3 月空月保留
    expect(profile.monthlyGrowth.map((m) => m.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
    ]);
    const jan = profile.monthlyGrowth[0];
    expect(jan.decisions).toBe(2);
    expect(jan.success).toBe(2);
    expect(jan.successRate).toBe(1);
    const feb = profile.monthlyGrowth[1];
    expect(feb.decisions).toBe(2);
    expect(feb.success).toBe(1);
    expect(feb.failure).toBe(1);
    expect(feb.successRate).toBe(0.5);
    expect(profile.monthlyGrowth[2].decisions).toBe(0); // 空月
    expect(profile.monthlyGrowth[2].successRate).toBe(0);
  });

  it('空值兜底：null / undefined / 脏时间戳不抛错，返回空档案', () => {
    const inputs: (GrowthDecision[] | null | undefined)[] = [null, undefined, [], [d('bad-date', 'success')]];
    for (const input of inputs) {
      const p = buildDoctorGrowthProfile('S2', { start: null, end: null }, input);
      expect(p.monthlyGrowth).toEqual([]);
      expect(p.expertiseTags).toEqual([]);
      expect(p.milestones).toEqual([]);
      expect(p.successTrend.direction).toBe('flat');
    }
  });
});

describe('successTrend 趋势分析', () => {
  it('有决策月份均分前后两段，加权成功率差值方向为 up', () => {
    const decisions = [
      d('2026-01-05T09:00:00Z', 'success'),
      d('2026-01-20T09:00:00Z', 'success'),
      d('2026-02-08T09:00:00Z', 'failure'),
      d('2026-02-18T09:00:00Z', 'success'),
      d('2026-04-10T09:00:00Z', 'success'),
    ];
    const profile = buildDoctorGrowthProfile('S1', { start: '2026-01-01', end: '2026-06-30' }, decisions);
    // active months: 01,02,04 → mid=2, first=[01,02] weighted=(2+1)/(2+2)=0.75; second=[04]=1
    expect(profile.successTrend.firstHalfRate).toBe(0.75);
    expect(profile.successTrend.secondHalfRate).toBe(1);
    expect(profile.successTrend.delta).toBe(0.25);
    expect(profile.successTrend.direction).toBe('up');
  });

  it('成功率下降时方向为 down', () => {
    const decisions = [
      d('2026-01-05T09:00:00Z', 'success'),
      d('2026-02-08T09:00:00Z', 'failure'),
      d('2026-02-18T09:00:00Z', 'failure'),
    ];
    const profile = buildDoctorGrowthProfile('S1', { start: '2026-01-01', end: '2026-03-31' }, decisions);
    expect(profile.successTrend.firstHalfRate).toBe(1);
    expect(profile.successTrend.secondHalfRate).toBe(0);
    expect(profile.successTrend.delta).toBe(-1);
    expect(profile.successTrend.direction).toBe('down');
  });
});

describe('lessonImprovement 教训闭环', () => {
  it('失败教训后出现同 tag 成功 → 记一次闭环', () => {
    const decisions = [
      d('2026-01-05T09:00:00Z', 'failure', { tag: '抗凝出血风险', lesson: '桥接过晚' }),
      d('2026-02-08T09:00:00Z', 'success', { tag: '抗凝出血风险' }),
      d('2026-03-10T09:00:00Z', 'failure', { tag: '抗生素升级', lesson: '经验性升梯' }),
    ];
    const profile = buildDoctorGrowthProfile('S1', { start: '2026-01-01', end: '2026-03-31' }, decisions);
    expect(profile.lessonImprovement.lessonsRecorded).toBe(2);
    expect(profile.lessonImprovement.failureLessons).toBe(2);
    expect(profile.lessonImprovement.closedLoops).toBe(1);
    expect(profile.lessonImprovement.improvementRate).toBe(0.5);
  });

  it('无失败教训时闭环率为 0，不除零', () => {
    const decisions = [d('2026-01-05T09:00:00Z', 'success', { tag: '胸痛分诊' })];
    const profile = buildDoctorGrowthProfile('S1', { start: '2026-01-01', end: '2026-01-31' }, decisions);
    expect(profile.lessonImprovement.failureLessons).toBe(0);
    expect(profile.lessonImprovement.improvementRate).toBe(0);
  });
});

describe('expertiseTags 与 milestones', () => {
  it('专长标签按频次降序', () => {
    const decisions = [
      d('2026-01-05T09:00:00Z', 'success', { tag: '抗凝出血风险' }),
      d('2026-01-06T09:00:00Z', 'success', { tag: '胸痛分诊' }),
      d('2026-01-07T09:00:00Z', 'success', { tag: '抗凝出血风险' }),
      d('2026-01-08T09:00:00Z', 'success', { tag: '抗凝出血风险' }),
    ];
    const profile = buildDoctorGrowthProfile('S1', { start: '2026-01-01', end: '2026-01-31' }, decisions);
    expect(profile.expertiseTags[0]).toEqual({ tag: '抗凝出血风险', count: 3 });
    expect(profile.expertiseTags[1]).toEqual({ tag: '胸痛分诊', count: 1 });
  });

  it('里程碑包含首次决策 / 首次成功 / 首次教训，按时间升序', () => {
    const decisions = [
      d('2026-01-05T09:00:00Z', 'failure', { lesson: '第一次教训' }),
      d('2026-02-08T09:00:00Z', 'success'),
    ];
    const profile = buildDoctorGrowthProfile('S1', { start: '2026-01-01', end: '2026-02-28' }, decisions);
    const types = profile.milestones.map((m) => m.type);
    expect(types).toContain('first_decision');
    expect(types).toContain('first_success');
    expect(types).toContain('first_lesson');
    // 按 at 升序
    for (let i = 1; i < profile.milestones.length; i++) {
      expect(profile.milestones[i].at >= profile.milestones[i - 1].at).toBe(true);
    }
  });
});

describe('computeRadarScores 雷达图数据', () => {
  it('关键词命中归一：最高维 = 100，其余按比例', () => {
    const profile = buildDoctorGrowthProfile(
      'S1',
      { start: '2026-01-01', end: '2026-06-30' },
      [
        d('2026-01-05T09:00:00Z', 'success', { tag: '抗凝出血风险' }),
        d('2026-01-06T09:00:00Z', 'success', { tag: '抗凝桥接剂量' }),
        d('2026-01-07T09:00:00Z', 'success', { tag: '胸痛分诊诊断' }),
        d('2026-01-08T09:00:00Z', 'success', { tag: '医患沟通告知' }),
      ],
    );
    const radar = computeRadarScores(profile);
    // medication 命中 2 条标签（抗凝/剂量），为最大值 → 100
    expect(radar.medication).toBe(100);
    expect(radar.diagnosis).toBeGreaterThan(0);
    expect(radar.communication).toBeGreaterThan(0);
    expect(radar.management).toBe(0); // 无管理类关键词
  });

  it('无维度信号时用近期成功率给中性基线，四维相等', () => {
    const profile = buildDoctorGrowthProfile(
      'S1',
      { start: '2026-01-01', end: '2026-01-31' },
      [d('2026-01-05T09:00:00Z', 'success')], // 无 tag → 无关键词命中
    );
    const radar = computeRadarScores(profile);
    expect(radar.diagnosis).toBe(radar.medication);
    expect(radar.medication).toBe(radar.communication);
    expect(radar.communication).toBe(radar.management);
    expect(radar.diagnosis).toBeGreaterThanOrEqual(20);
  });
});
