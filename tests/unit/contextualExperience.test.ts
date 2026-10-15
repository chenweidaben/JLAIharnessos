/**
 * 健澜科技 jlmedaios - 场景化经验自动推荐单测（M118-A，依据宪法第七章）
 *
 * 覆盖：
 *  - 相关度计算：动作命中 +5 / 科室命中 +3 / 合并症命中 +2 每条 / 教训 +2；
 *  - Top N 排序：rankRelevantExperiences 按命中分降序截取、tie-break 确定；
 *  - 空场景兜底：空池返回 []；全零命中退回默认信号排序，不抛错。
 *
 * 注意：纯函数测试，不连接 PostgreSQL、不碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  ACTION_MATCH_WEIGHT,
  CONDITION_HIT_WEIGHT,
  DEPT_MATCH_WEIGHT,
  LESSON_BONUS_WEIGHT,
  buildDefaultContextualExperiences,
  rankRelevantExperiences,
  recommendContextualExperience,
  type ClinicalExperience,
} from '../../src/bff/aggregators/contextualExperienceAggregator.js';

/** 构造一条最小经验条目，便于断言权重 */
function mkExp(partial: Partial<ClinicalExperience>): ClinicalExperience {
  return {
    id: partial.id ?? 'EXP-X',
    title: partial.title ?? '经验X',
    tags: partial.tags ?? [],
    actions: partial.actions ?? [],
    departments: partial.departments ?? [],
    sourceRole: partial.sourceRole ?? 'doctor',
    ...partial,
  };
}

describe('recommendContextualExperience 相关度计算', () => {
  it('动作命中加 ACTION_MATCH_WEIGHT 并标注 action 原因', () => {
    const pool = [mkExp({ id: 'A', actions: ['prescription'] })];
    const out = recommendContextualExperience('staff-1', {}, 'prescription', pool);
    expect(out).toHaveLength(1);
    expect(out[0].score).toBe(ACTION_MATCH_WEIGHT);
    expect(out[0].reasons).toContain('action');
  });

  it('科室命中加 DEPT_MATCH_WEIGHT、合并症每条加 CONDITION_HIT_WEIGHT', () => {
    const pool = [
      mkExp({ id: 'B', departments: ['cardio'], tags: ['抗凝', '出血'] }),
    ];
    const out = recommendContextualExperience(
      'staff-1',
      { dept: 'Cardio', conditions: ['抗凝', '出血'] },
      '',
      pool,
    );
    // 科室 3 + 两个合并症命中 2*2 = 7
    expect(out[0].score).toBe(DEPT_MATCH_WEIGHT + 2 * CONDITION_HIT_WEIGHT);
  });

  it('失败教训额外加 LESSON_BONUS_WEIGHT 且原因含 lesson', () => {
    const pool = [mkExp({ id: 'C', actions: ['prescription'], isLesson: true })];
    const out = recommendContextualExperience('staff-1', {}, 'prescription', pool);
    expect(out[0].score).toBe(ACTION_MATCH_WEIGHT + LESSON_BONUS_WEIGHT);
    expect(out[0].reasons).toContain('lesson');
  });

  it('staffId 不参与打分，同一结果与 staffId 无关', () => {
    const pool = [mkExp({ id: 'D', actions: ['triage'] })];
    const a = recommendContextualExperience('s1', {}, 'triage', pool);
    const b = recommendContextualExperience('another-staff', {}, 'triage', pool);
    expect(a[0].score).toBe(b[0].score);
  });
});

describe('rankRelevantExperiences Top N 排序', () => {
  it('按命中分降序并截取 topN', () => {
    const pool = [
      mkExp({ id: 'low', title: '门诊随访安排', tags: ['随访'] }),
      mkExp({ id: 'high', title: '抗凝药出血风险复核', tags: ['抗凝', '出血', '华法林'] }),
      mkExp({ id: 'mid', title: '抗凝药门诊管理', tags: ['抗凝'] }),
    ];
    const out = rankRelevantExperiences('抗凝', pool, 2);
    expect(out).toHaveLength(2);
    // high 命中标题+标签(+2)，mid 命中标题+标签(+2)，low 零命中被挤出
    expect(out[0].id).toBe('high');
    expect(out[1].id).toBe('mid');
  });

  it('topN 非法时回退默认条数', () => {
    const pool = buildDefaultContextualExperiences();
    const out = rankRelevantExperiences('处方', pool, 0);
    expect(out.length).toBeGreaterThan(0);
  });

  it('排序确定：命中分降序 → 成功率降序 → 标题字典序', () => {
    const pool = [
      mkExp({ id: 'z', title: 'Z经验', tags: ['x'], successRate: 0.8, useCount: 1 }),
      mkExp({ id: 'a', title: 'A经验', tags: ['x'], successRate: 0.9, useCount: 1 }),
    ];
    const out = rankRelevantExperiences('x', pool, 10);
    // 同分(标题+标签=7)，成功率 0.9 者在前
    expect(out[0].id).toBe('a');
    expect(out[1].id).toBe('z');
  });
});

describe('空场景兜底', () => {
  it('空池 / null 入参返回 [] 且不抛错', () => {
    expect(recommendContextualExperience('s', {}, 'prescription', [])).toEqual([]);
    expect(recommendContextualExperience('s', null, null, null)).toEqual([]);
    expect(rankRelevantExperiences('anything', [], 5)).toEqual([]);
    expect(rankRelevantExperiences('anything', null, 5)).toEqual([]);
  });

  it('零命中场景退回默认信号排序，返回全部而非空白', () => {
    const pool = [
      mkExp({ id: 'good', title: '甲经验', tags: ['慢阻肺'], successRate: 0.95, useCount: 300 }),
      mkExp({ id: 'bad', title: '乙经验', tags: ['慢阻肺'], successRate: 0.4, useCount: 2 }),
    ];
    // 查询词与任何标签/标题都不沾边
    const out = recommendContextualExperience('s', { dept: 'nope' }, 'unknown-action', pool);
    expect(out.length).toBe(2);
    // 默认排序按成功率降序
    expect(out[0].id).toBe('good');
  });

  it('空 query 时 rankRelevantExperiences 仍返回确定的默认排序', () => {
    const pool = [
      mkExp({ id: 'p', title: '丙', tags: ['t'], successRate: 0.7 }),
      mkExp({ id: 'q', title: '丁', tags: ['t'], successRate: 0.9 }),
    ];
    const out = rankRelevantExperiences('', pool, 10);
    expect(out[0].id).toBe('q');
  });
});
