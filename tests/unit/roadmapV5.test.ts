/**
 * 健澜科技 jlmedaios - v5.0 产品路线图纯函数单测（M181-D）
 *
 * 覆盖：
 *  - generateRoadmapV5：三阶段（近 v5.0-5.2 / 中 v5.3-5.5 / 远 v5.6-6.0）/ 9 条事项 / 当前版本回传 / 300 版本里程碑 / 返回值不可变；
 *  - prioritizeRoadmapItemsV5：默认权重打分排序锚点（AI大脑2.0 居首、元宇宙诊室垫底）、权重覆盖改变排序；
 *  - estimateEffortV5：阶段基线 + 耦合 + 风险折算人周与档位、置信度按阶段递减。
 *
 * 仅测纯函数，不触碰 IO / 时钟 / 网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  MILESTONE_300_VERSION,
  estimateEffortV5,
  generateRoadmapV5,
  prioritizeRoadmapItemsV5,
  type RoadmapItemV5,
} from '../../src/bff/aggregators/roadmapV5Aggregator';

describe('generateRoadmapV5 v5.0 路线图生成', () => {
  it('回传当前版本号', () => {
    const r = generateRoadmapV5('v4.9.0');
    expect(r.currentVersion).toBe('v4.9.0');
  });

  it('固定三阶段元信息（近 v5.0-5.2 / 中 v5.3-5.5 / 远 v5.6-6.0）', () => {
    const r = generateRoadmapV5('v4.9.0');
    expect(r.phases.map((p) => p.phase)).toEqual(['near', 'mid', 'far']);
    expect(r.phases[0].versionRange).toBe('v5.0 - v5.2');
    expect(r.phases[1].versionRange).toBe('v5.3 - v5.5');
    expect(r.phases[2].versionRange).toBe('v5.6 - v6.0');
  });

  it('事项目录共 9 条，每阶段各 3 条，主题与任务口径一致', () => {
    const r = generateRoadmapV5('v4.9.0');
    expect(r.items).toHaveLength(9);
    expect(r.items.filter((i) => i.phase === 'near')).toHaveLength(3);
    expect(r.items.filter((i) => i.phase === 'mid')).toHaveLength(3);
    expect(r.items.filter((i) => i.phase === 'far')).toHaveLength(3);

    // 近期：AI医院大脑2.0 / 数字孪生3D深化 / 全自学习闭环
    expect(r.items.filter((i) => i.phase === 'near').map((i) => i.theme).sort()).toEqual([
      'AI医院大脑2.0',
      '全自学习闭环',
      '数字孪生3D深化',
    ]);
    // 中期：区域医疗协同 / 医联体 / 分级诊疗深化（按 Unicode 码点排序：分<区<医）
    expect(r.items.filter((i) => i.phase === 'mid').map((i) => i.theme).sort()).toEqual([
      '分级诊疗深化',
      '区域医疗协同',
      '医联体',
    ]);
    // 远期：数字孪生医院 / 元宇宙诊室 / 全自学习医院（按 Unicode 码点排序：元<全<数）
    expect(r.items.filter((i) => i.phase === 'far').map((i) => i.theme).sort()).toEqual([
      '元宇宙诊室',
      '全自学习医院',
      '数字孪生医院',
    ]);
  });

  it('包含 300 版本里程碑且指向全自学习医院 v6.0', () => {
    const r = generateRoadmapV5('v4.9.0');
    expect(MILESTONE_300_VERSION).toBe('v6.0');
    expect(r.milestones.join('\n')).toContain('300版本里程碑');
    const selfHospital = r.items.find((i) => i.id === 'far-self-learning-hospital');
    expect(selfHospital?.targetVersion).toBe(MILESTONE_300_VERSION);
  });

  it('返回值为拷贝，外部 mutate 不影响下次生成（纯函数不变量）', () => {
    const r = generateRoadmapV5('v1.0.0');
    (r.items as RoadmapItemV5[]).push({} as RoadmapItemV5);
    r.phases.push({ phase: 'near', label: 'x', versionRange: 'x', goal: 'x' });
    const r2 = generateRoadmapV5('v1.0.0');
    expect(r2.items).toHaveLength(9);
    expect(r2.phases).toHaveLength(3);
  });
});

describe('prioritizeRoadmapItemsV5 优先级排序', () => {
  const roadmap = generateRoadmapV5('v4.9.0');

  it('默认口径：旗舰 AI 大脑 2.0 居首，远期元宇宙诊室垫底', () => {
    const ranked = prioritizeRoadmapItemsV5(roadmap.items);
    expect(ranked).toHaveLength(9);
    expect(ranked[0].item.id).toBe('near-ai-brain-2');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[8].item.id).toBe('far-meta-consult-room');
    expect(ranked[8].rank).toBe(9);
  });

  it('得分手算锚点：AI大脑2.0 = 6.0，元宇宙诊室 = -1.0', () => {
    const ranked = prioritizeRoadmapItemsV5(roadmap.items);
    expect(ranked.find((p) => p.item.id === 'near-ai-brain-2')?.score).toBe(6.0);
    expect(ranked.find((p) => p.item.id === 'far-meta-consult-room')?.score).toBe(-1.0);
  });

  it('排名连续从 1 开始', () => {
    const ranked = prioritizeRoadmapItemsV5(roadmap.items);
    expect(ranked.map((p) => p.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('每条都带一句话排序理由', () => {
    const ranked = prioritizeRoadmapItemsV5(roadmap.items);
    expect(ranked.every((p) => typeof p.rationale === 'string' && p.rationale.length > 0)).toBe(true);
  });

  it('权重覆盖：只看用户影响（wUser=10，其余权重清零）时，影响面最广的 AI 大脑 2.0（u=5）居首且得分=50', () => {
    const ranked = prioritizeRoadmapItemsV5(roadmap.items, {
      wBusiness: 0,
      wUser: 10,
      wRisk: 0,
      wDependency: 0,
    });
    expect(ranked[0].item.id).toBe('near-ai-brain-2');
    expect(ranked[0].score).toBe(50.0);
  });
});

describe('estimateEffortV5 工作量估算', () => {
  const byId = (id: string): RoadmapItemV5 => {
    const item = generateRoadmapV5('v4.9.0').items.find((i) => i.id === id);
    if (!item) throw new Error(`missing item ${id}`);
    return item;
  };

  it('近期 AI 大脑 2.0：基线3 + 耦合3*1.5 + 风险(3-1)*0.8 = 9.1人周，落 L 档，置信 0.85', () => {
    const e = estimateEffortV5(byId('near-ai-brain-2'));
    expect(e.personWeeks).toBe(9.1);
    expect(e.size).toBe('L');
    expect(e.confidence).toBe(0.85);
  });

  it('中期分级诊疗深化：基线7 + 耦合3*1.5 + 风险(3-1)*0.8 = 13.1人周，L 档，置信 0.62', () => {
    const e = estimateEffortV5(byId('mid-grading-diagnosis'));
    expect(e.personWeeks).toBe(13.1);
    expect(e.size).toBe('L');
    expect(e.confidence).toBe(0.62);
  });

  it('远期全自学习医院：耦合最深(5)+风险最高(5)，落到 XL 档，置信最低 0.4', () => {
    const e = estimateEffortV5(byId('far-self-learning-hospital'));
    expect(e.personWeeks).toBe(21.7);
    expect(e.size).toBe('XL');
    expect(e.confidence).toBe(0.4);
  });

  it('置信度随阶段递减：near > mid > far', () => {
    const near = estimateEffortV5(byId('near-twin3d-deepen')).confidence;
    const mid = estimateEffortV5(byId('mid-grading-diagnosis')).confidence;
    const far = estimateEffortV5(byId('far-meta-consult-room')).confidence;
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
  });
});
