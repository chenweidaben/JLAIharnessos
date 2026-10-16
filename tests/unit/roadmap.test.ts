/**
 * 健澜科技 jlmedaios - v4.x 产品路线图纯函数单测（M157-D）
 *
 * 覆盖：
 *  - generateRoadmap：三阶段 / 9 条事项目录 / 当前版本回传 / 200 版本里程碑 / 返回值不可变；
 *  - prioritizeRoadmapItems：默认权重打分排序锚点（近->中->远）、权重覆盖改变排序；
 *  - estimateEffort：阶段基线 + 耦合 + 风险折算人周与档位、置信度按阶段递减。
 *
 * 仅测纯函数，不触碰 IO / 时钟 / 网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  MILESTONE_200_VERSION,
  estimateEffort,
  generateRoadmap,
  prioritizeRoadmapItems,
  type RoadmapItem,
} from '../../src/bff/aggregators/roadmapAggregator';

describe('generateRoadmap 路线图生成', () => {
  it('回传当前版本号', () => {
    const r = generateRoadmap('v3.9.0');
    expect(r.currentVersion).toBe('v3.9.0');
  });

  it('固定三阶段元信息（近/中/远）', () => {
    const r = generateRoadmap('v3.9.0');
    expect(r.phases.map((p) => p.phase)).toEqual(['near', 'mid', 'far']);
    expect(r.phases[0].versionRange).toBe('v4.0 - v4.2');
    expect(r.phases[2].versionRange).toBe('v4.6 - v5.0');
  });

  it('事项目录共 9 条，每阶段各 3 条', () => {
    const r = generateRoadmap('v3.9.0');
    expect(r.items).toHaveLength(9);
    expect(r.items.filter((i) => i.phase === 'near')).toHaveLength(3);
    expect(r.items.filter((i) => i.phase === 'mid')).toHaveLength(3);
    expect(r.items.filter((i) => i.phase === 'far')).toHaveLength(3);
  });

  it('包含 200 版本里程碑且指向全自学习闭环', () => {
    const r = generateRoadmap('v3.9.0');
    expect(MILESTONE_200_VERSION).toBe('v5.0');
    expect(r.milestones.join('\n')).toContain('200版本里程碑');
    const selfLoop = r.items.find((i) => i.id === 'far-self-learning-loop');
    expect(selfLoop?.targetVersion).toBe(MILESTONE_200_VERSION);
  });

  it('返回值为拷贝，外部 mutate 不影响下次生成（纯函数不变量）', () => {
    const r = generateRoadmap('v1.0.0');
    (r.items as RoadmapItem[]).push({} as RoadmapItem);
    r.phases.push({ phase: 'near', label: 'x', versionRange: 'x', goal: 'x' });
    const r2 = generateRoadmap('v1.0.0');
    expect(r2.items).toHaveLength(9);
    expect(r2.phases).toHaveLength(3);
  });
});

describe('prioritizeRoadmapItems 优先级排序', () => {
  const roadmap = generateRoadmap('v3.9.0');

  it('默认口径：近期见效快的排最前，远期探索项排最后', () => {
    const ranked = prioritizeRoadmapItems(roadmap.items);
    expect(ranked).toHaveLength(9);
    expect(ranked[0].item.id).toBe('near-perf-optimize');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[8].item.id).toBe('far-meta-consult');
    expect(ranked[8].rank).toBe(9);
  });

  it('得分手算锚点：near-perf = 4.8，far-meta = -1.0', () => {
    const ranked = prioritizeRoadmapItems(roadmap.items);
    expect(ranked.find((p) => p.item.id === 'near-perf-optimize')?.score).toBe(4.8);
    expect(ranked.find((p) => p.item.id === 'far-meta-consult')?.score).toBe(-1.0);
  });

  it('排名连续从 1 开始', () => {
    const ranked = prioritizeRoadmapItems(roadmap.items);
    expect(ranked.map((p) => p.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('每条都带一句话排序理由', () => {
    const ranked = prioritizeRoadmapItems(roadmap.items);
    expect(ranked.every((p) => typeof p.rationale === 'string' && p.rationale.length > 0)).toBe(true);
  });

  it('权重覆盖：极度看重用户影响时，移动端完善(影响面5)跃升前列', () => {
    const ranked = prioritizeRoadmapItems(roadmap.items, { wUser: 10, wRisk: 0, wDependency: 0 });
    // near-mobile userImpact=5 -> 10*5=50，业务价值不再压制
    expect(ranked[0].item.id).toBe('near-mobile-polish');
  });
});

describe('estimateEffort 工作量估算', () => {
  const byId = (id: string): RoadmapItem => {
    const item = generateRoadmap('v3.9.0').items.find((i) => i.id === id);
    if (!item) throw new Error(`missing item ${id}`);
    return item;
  };

  it('近期性能优化：基线3 + 耦合3*1.5 + 风险(2-1)*0.8 = 8.3人周，档 M', () => {
    const e = estimateEffort(byId('near-perf-optimize'));
    expect(e.personWeeks).toBe(8.3);
    expect(e.size).toBe('M');
    expect(e.confidence).toBe(0.85);
  });

  it('中期集团化：耦合最深(5)，落到 XL 档', () => {
    const e = estimateEffort(byId('mid-group-expansion'));
    expect(e.personWeeks).toBe(16.9);
    expect(e.size).toBe('XL');
    expect(e.confidence).toBe(0.62);
  });

  it('远期数字孪生：探索性强，置信度最低 0.4', () => {
    const e = estimateEffort(byId('far-digital-twin'));
    expect(e.size).toBe('XL');
    expect(e.confidence).toBe(0.4);
  });

  it('置信度随阶段递减：near > mid > far', () => {
    const near = estimateEffort(byId('near-i18n-deepen')).confidence;
    const mid = estimateEffort(byId('mid-research-smart')).confidence;
    const far = estimateEffort(byId('far-self-learning-loop')).confidence;
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
  });
});
