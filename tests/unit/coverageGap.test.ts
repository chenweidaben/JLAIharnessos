/**
 * 健澜科技 jlmedaios — M173-A 覆盖率缺口纯函数单测（99% → 99.5%+）
 *
 * 【质量提升与新场景】
 *
 * 覆盖三大方向（任务书指定）：
 *   1. identifyRemainingCoverageGaps：基线数字自洽（四桶求和 == 剩余行）、
 *      hotspot 求和 == 桶行数；边界入参（NaN / 越界 / target<current / 非正 totalLines）；
 *   2. generateCoverageImprovementPlan：计划行数求和 == 2500、执行后行率 == 0.995、
 *      P0→P2 排序确定性、空 gaps 不抛错、targetLines 不超 hotspot 剩余；
 *   3. trackCoverageProgress：并发重复事件幂等、未知 itemId 丢弃、
 *      负 coveredLinesAdded clamp、全部完成后 projectedRate == 0.995 / achieved。
 *
 * 与持久化解耦，不触库、不发网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  generateCoverageImprovementPlan,
  identifyRemainingCoverageGaps,
  trackCoverageProgress,
} from '../../src/bff/aggregators/coverageGapAggregator';

describe('identifyRemainingCoverageGaps 基线自洽', () => {
  it('基线数字：当前 0.99 / 目标 0.995 / 总行 500000 / 已覆盖 495000 / 剩余 5000', () => {
    const r = identifyRemainingCoverageGaps({ generatedAt: '2026-10-16T00:00:00Z' });
    expect(r.generatedAt).toBe('2026-10-16T00:00:00Z');
    expect(r.currentRate).toBe(0.99);
    expect(r.targetRate).toBe(0.995);
    expect(r.totalLines).toBe(500000);
    expect(r.coveredLines).toBe(495000);
    expect(r.remainingLines).toBe(5000);
    expect(r.linesNeededToTarget).toBe(2500); // 500000 * 0.005 = 2500
    expect(r.targetPass).toBe(false);
  });

  it('四桶缺口行数：错误处理 1800 / 边界 1500 / 权限 900 / 降级 800，求和 == 5000', () => {
    const r = identifyRemainingCoverageGaps();
    const byCat = Object.fromEntries(r.categories.map((c) => [c.category, c]));
    expect(byCat.error_handling.uncoveredLines).toBe(1800);
    expect(byCat.boundary.uncoveredLines).toBe(1500);
    expect(byCat.permission.uncoveredLines).toBe(900);
    expect(byCat.degradation.uncoveredLines).toBe(800);
    expect(r.totalUncoveredLines).toBe(5000);
    expect(r.totalUncoveredLines).toBe(r.remainingLines);
  });

  it('每桶 hotspot 行数求和 == 桶行数（杜绝凑数）', () => {
    const r = identifyRemainingCoverageGaps();
    for (const cat of r.categories) {
      const sum = cat.hotspots.reduce((acc, h) => acc + h.uncoveredLines, 0);
      expect(sum).toBe(cat.uncoveredLines);
    }
  });

  it('桶顺序固定：error_handling → boundary → permission → degradation', () => {
    const r = identifyRemainingCoverageGaps();
    expect(r.categories.map((c) => c.category)).toEqual([
      'error_handling',
      'boundary',
      'permission',
      'degradation',
    ]);
  });

  it('风险权重：错误处理与权限为 3（最高），边界与降级为 2', () => {
    const r = identifyRemainingCoverageGaps();
    const byCat = Object.fromEntries(r.categories.map((c) => [c.category, c]));
    expect(byCat.error_handling.riskWeight).toBe(3);
    expect(byCat.permission.riskWeight).toBe(3);
    expect(byCat.boundary.riskWeight).toBe(2);
    expect(byCat.degradation.riskWeight).toBe(2);
  });
});

describe('identifyRemainingCoverageGaps 边界入参', () => {
  it('NaN 当前行率 → 回退基线 0.99', () => {
    const r = identifyRemainingCoverageGaps({ currentRate: Number.NaN });
    expect(r.currentRate).toBe(0.99);
  });

  it('越界行率（>1 / <0）→ clamp 到 [0,1]（同时给目标值，避免触发翻转）', () => {
    const hi = identifyRemainingCoverageGaps({ currentRate: 1.5, targetRate: 2 });
    expect(hi.currentRate).toBe(1);
    expect(hi.targetRate).toBe(1);
    const lo = identifyRemainingCoverageGaps({ currentRate: -0.2, targetRate: 0.5 });
    expect(lo.currentRate).toBe(0);
  });

  it('目标 < 当前 → 自动翻转（不出现负增量）', () => {
    const r = identifyRemainingCoverageGaps({ currentRate: 0.995, targetRate: 0.99 });
    expect(r.currentRate).toBeLessThanOrEqual(r.targetRate);
    expect(r.deltaToTarget).toBeGreaterThanOrEqual(0);
  });

  it('target >= current → targetPass=true', () => {
    const r = identifyRemainingCoverageGaps({ currentRate: 0.996, targetRate: 0.995 });
    // 翻转后 current=0.995 target=0.996；再用一次真正达标
    const ok = identifyRemainingCoverageGaps({ currentRate: 0.996, targetRate: 0.996 });
    expect(ok.targetPass).toBe(true);
  });

  it('非正 totalLines（0 / -100 / NaN）→ 回退基线 500000', () => {
    for (const bad of [0, -100, Number.NaN]) {
      const r = identifyRemainingCoverageGaps({ totalLines: bad });
      expect(r.totalLines).toBe(500000);
    }
  });

  it('自定义 totalLines → coveredLines 与 remainingLines 自洽', () => {
    const r = identifyRemainingCoverageGaps({ totalLines: 100000 });
    expect(r.totalLines).toBe(100000);
    expect(r.coveredLines).toBe(99000);
    expect(r.remainingLines).toBe(1000);
  });

  it('空入参对象与缺省调用结果一致（确定性）', () => {
    const a = identifyRemainingCoverageGaps({ generatedAt: 'FIXED' });
    const b = identifyRemainingCoverageGaps({ generatedAt: 'FIXED' });
    expect(a).toEqual(b);
  });
});

describe('generateCoverageImprovementPlan 提升计划', () => {
  const gaps = identifyRemainingCoverageGaps({ generatedAt: 'FIXED' });

  it('17 个条目（5+4+4+4）全部命中测试技术配方', () => {
    const plan = generateCoverageImprovementPlan(gaps);
    expect(plan.items.length).toBe(17);
  });

  it('计划补测行数求和 == 2500，执行后行率 == 0.995，reachesTarget=true', () => {
    const plan = generateCoverageImprovementPlan(gaps);
    expect(plan.totalPlannedLines).toBe(2500);
    // (495000 + 2500) / 500000 = 0.995
    expect(plan.estimatedRateAfter).toBeCloseTo(0.995, 10);
    expect(plan.reachesTarget).toBe(true);
  });

  it('优先级排序：全部 P0 在 P1 前，P1 在 P2 前（确定性）', () => {
    const plan = generateCoverageImprovementPlan(gaps);
    const priRank: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
    for (let i = 1; i < plan.items.length; i++) {
      expect(priRank[plan.items[i].priority]).toBeGreaterThanOrEqual(
        priRank[plan.items[i - 1].priority],
      );
    }
    expect(plan.items[0].priority).toBe('P0');
    expect(plan.items[plan.items.length - 1].priority).toBe('P2');
  });

  it('同优先级内按 targetLines 降序', () => {
    const plan = generateCoverageImprovementPlan(gaps);
    for (let i = 1; i < plan.items.length; i++) {
      const prev = plan.items[i - 1];
      const cur = plan.items[i];
      if (prev.priority === cur.priority) {
        expect(cur.targetLines).toBeLessThanOrEqual(prev.targetLines);
      }
    }
  });

  it('每条 targetLines 不超过对应 hotspot 剩余行数（不凑数）', () => {
    const plan = generateCoverageImprovementPlan(gaps);
    const hotspotByKey = new Map<string, number>();
    for (const cat of gaps.categories) {
      for (const h of cat.hotspots) {
        hotspotByKey.set(`${h.file}::${h.symbol}`, h.uncoveredLines);
      }
    }
    for (const it of plan.items) {
      const key = `${it.file}::${it.symbol}`;
      const cap = hotspotByKey.get(key) ?? Number.POSITIVE_INFINITY;
      expect(it.targetLines).toBeLessThanOrEqual(cap);
    }
  });

  it('空 gaps / null / undefined → 返回空计划，不抛错', () => {
    const empty = generateCoverageImprovementPlan(null);
    expect(empty.items).toEqual([]);
    expect(empty.totalPlannedLines).toBe(0);
    expect(empty.reachesTarget).toBe(false);

    const undef = generateCoverageImprovementPlan(undefined);
    expect(undef.items.length).toBe(0);

    const noCats = generateCoverageImprovementPlan({
      ...gaps,
      categories: [],
    });
    expect(noCats.items).toEqual([]);
  });

  it('预计工作量合计为正数', () => {
    const plan = generateCoverageImprovementPlan(gaps);
    expect(plan.totalEffortHours).toBeGreaterThan(0);
  });
});

describe('trackCoverageProgress 进度跟踪', () => {
  const gaps = identifyRemainingCoverageGaps({ generatedAt: 'FIXED' });
  const plan = generateCoverageImprovementPlan(gaps);

  it('无 plan / null → not_started 全零', () => {
    const p = trackCoverageProgress(null, null);
    expect(p.status).toBe('not_started');
    expect(p.totalItems).toBe(0);
    expect(p.coveredAdded).toBe(0);
  });

  it('有 plan 但无事件 → not_started，doneItems=0', () => {
    const p = trackCoverageProgress(plan, null);
    expect(p.status).toBe('not_started');
    expect(p.doneItems).toBe(0);
    expect(p.pendingItems).toBe(plan.items.length);
    expect(p.completionPct).toBe(0);
  });

  it('已知 itemId 事件 → doneItems 与 coveredAdded 正确累加', () => {
    const first = plan.items[0];
    const p = trackCoverageProgress(plan, {
      startedAt: '2026-10-16T00:00:00Z',
      events: [
        { itemId: first.id, done: true, coveredLinesAdded: first.targetLines, at: 't1' },
      ],
    });
    expect(p.doneItems).toBe(1);
    expect(p.coveredAdded).toBe(first.targetLines);
    expect(p.status).not.toBe('not_started');
  });

  it('并发重复事件（同一 itemId 多次上报）→ 幂等：done 不回退，added 取最大', () => {
    const first = plan.items[0];
    const p = trackCoverageProgress(plan, {
      startedAt: 't0',
      events: [
        { itemId: first.id, done: true, coveredLinesAdded: 100, at: 't1' },
        { itemId: first.id, done: true, coveredLinesAdded: 240, at: 't2' }, // 并发重复
        { itemId: first.id, done: false, coveredLinesAdded: 50, at: 't3' }, // 迟到假回退
      ],
    });
    expect(p.doneItems).toBe(1); // done 一旦 true 不回退
    expect(p.coveredAdded).toBe(240); // added 取最大
  });

  it('未知 itemId 事件 → 丢弃并计入 droppedEvents', () => {
    const p = trackCoverageProgress(plan, {
      startedAt: 't0',
      events: [
        { itemId: 'not-exists', done: true, coveredLinesAdded: 999, at: 't1' },
        { itemId: plan.items[0].id, done: true, coveredLinesAdded: 10, at: 't2' },
      ],
    });
    expect(p.droppedEvents).toBe(1);
    expect(p.coveredAdded).toBe(10); // 999 被丢弃
  });

  it('负 coveredLinesAdded → clamp 到 0，不误减', () => {
    const first = plan.items[0];
    const p = trackCoverageProgress(plan, {
      startedAt: 't0',
      events: [
        { itemId: first.id, done: true, coveredLinesAdded: -500, at: 't1' },
      ],
    });
    expect(p.coveredAdded).toBe(0);
  });

  it('全部 17 条完成且补满 2500 行 → projectedRate == 0.995，status=achieved', () => {
    const events = plan.items.map((it) => ({
      itemId: it.id,
      done: true,
      coveredLinesAdded: it.targetLines,
      at: 't-done',
    }));
    const p = trackCoverageProgress(plan, { startedAt: 't0', events });
    expect(p.doneItems).toBe(plan.items.length);
    expect(p.coveredAdded).toBe(2500);
    expect(p.projectedRate).toBeCloseTo(0.995, 10);
    expect(p.remainingLinesToTarget).toBe(0);
    expect(p.status).toBe('achieved');
  });

  it('完成一半条目 → status 为 in_progress 或 on_track（不越界）', () => {
    const half = plan.items.slice(0, 9); // P0 全部
    const events = half.map((it) => ({
      itemId: it.id,
      done: true,
      coveredLinesAdded: it.targetLines,
      at: 't-half',
    }));
    const p = trackCoverageProgress(plan, { startedAt: 't0', events });
    expect(p.doneItems).toBe(9);
    expect(p.status).toBe('in_progress');
  });
});
