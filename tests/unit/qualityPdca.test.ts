/**
 * 健澜科技 jlmedaios — 【质量与合规】PDCA 纯函数单测（M155-A）
 *
 * 覆盖：
 *   createPDCAProject（默认落 Plan 阶段 / 参数校验）
 *   advancePDCAPhase（合法流转 / 拒绝跳跃 / Do→Check 需实施记录 /
 *                    Check→Act 需前后数据 / Act→Plan 遗留问题延续）
 *   calculatePDCAEffect（before/after 真实数学：改善幅度、目标达成率、
 *                       verdict、underpowered、higher_better 方向）
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  advancePDCAPhase,
  calculatePDCAEffect,
  createPDCAProject,
  PdcaError,
  type PDCAProject,
} from '../../src/bff/aggregators/qualityPdcaAggregator';

const NOW = '2026-10-16T08:00:00.000Z';

function makeProject(overrides?: Partial<PDCAProject>): PDCAProject {
  const p = createPDCAProject(
    '降低住院跌倒发生率',
    '神经内科',
    '张医生',
    {
      metric: '跌倒发生率',
      unit: '‰',
      direction: 'lower_better',
      baseline: 4.2,
      goal: 1.5,
    },
    { id: 'pdca_test_1', now: NOW },
  );
  return { ...p, ...overrides };
}

describe('createPDCAProject（项目创建）', () => {
  it('默认落在 Plan 阶段并写入初始阶段轨迹', () => {
    const p = makeProject();
    expect(p.phase).toBe('Plan');
    expect(p.name).toBe('降低住院跌倒发生率');
    expect(p.closed).toBe(false);
    expect(p.phaseHistory).toHaveLength(1);
    expect(p.phaseHistory[0].phase).toBe('Plan');
    expect(p.check).toBeNull();
  });

  it('空名称/科室/负责人直接抛 400', () => {
    expect(() => createPDCAProject('', '内科', '李', {
      metric: 'x', unit: '%', direction: 'lower_better', baseline: 1, goal: 0,
    })).toThrow(PdcaError);
    expect(() => createPDCAProject('n', '', '李', {
      metric: 'x', unit: '%', direction: 'lower_better', baseline: 1, goal: 0,
    })).toThrow(PdcaError);
  });

  it('非法方向抛错', () => {
    expect(() =>
      createPDCAProject('n', 'd', 'l', {
        metric: 'x', unit: '%', direction: 'sideways' as never, baseline: 1, goal: 0,
      }),
    ).toThrow(/方向/);
  });
});

describe('advancePDCAPhase（阶段推进，状态机）', () => {
  it('Plan→Do 合法，Do→Check 需要实施记录', () => {
    const p = makeProject();
    const afterDo = advancePDCAPhase(p, 'Do', { now: NOW, note: '开始执行' });
    expect(afterDo.phase).toBe('Do');
    expect(afterDo.phaseHistory).toHaveLength(2);

    // 没有 doRecords 时，Do→Check 被拒绝（Check 不能空对空）
    expect(() => advancePDCAPhase(afterDo, 'Check', { now: NOW })).toThrow(/Do/);

    // 补一条实施记录后再推进
    const withRecord: PDCAProject = {
      ...afterDo,
      doRecords: [{ measure: '床栏评估', owner: '王护士', executedAt: NOW }],
    };
    const afterCheck = advancePDCAPhase(withRecord, 'Check', { now: NOW });
    expect(afterCheck.phase).toBe('Check');
  });

  it('拒绝阶段跳跃（Plan→Check）与回退', () => {
    const p = makeProject();
    expect(() => advancePDCAPhase(p, 'Check', { now: NOW })).toThrow(/非法/);
    expect(() => advancePDCAPhase(p, 'Plan', { now: NOW })).toThrow(/非法/);
  });

  it('Check→Act 需要 before/after 数据；Act 无遗留则闭环', () => {
    const inCheck = makeProject({
      phase: 'Check',
      doRecords: [{ measure: 'm', owner: 'o', executedAt: NOW }],
    });
    // 未提交 check 数据时拒绝进入 Act
    expect(() => advancePDCAPhase(inCheck, 'Act', { now: NOW })).toThrow(/Check/);

    const withData: PDCAProject = {
      ...inCheck,
      check: { before: { sampleSize: 120, rate: 4.2 }, after: { sampleSize: 130, rate: 1.2 } },
    };
    const act = advancePDCAPhase(withData, 'Act', { now: NOW });
    expect(act.phase).toBe('Act');
    // 无遗留问题 → 闭环
    expect(act.closed).toBe(true);
  });

  it('Act→Plan 把遗留问题带入下一循环', () => {
    const inAct = makeProject({
      phase: 'Act',
      doRecords: [{ measure: 'm', owner: 'o', executedAt: NOW }],
      check: { before: { sampleSize: 120, rate: 4.2 }, after: { sampleSize: 130, rate: 3.0 } },
      act: { standardized: ['跌倒评估单标准化'], carryover: '夜间巡视频次仍不足' },
    });
    const nextCycle = advancePDCAPhase(inAct, 'Plan', { now: NOW });
    expect(nextCycle.phase).toBe('Plan');
    expect(nextCycle.closed).toBe(false);
    expect(nextCycle.plan.problem).toContain('夜间巡视频次仍不足');
    expect(nextCycle.check).toBeNull();
  });
});

describe('calculatePDCAEffect（before/after 真实效果计算）', () => {
  it('lower_better：率值下降到目标内 → met，改善幅度数学正确', () => {
    const p = makeProject({
      phase: 'Check',
      doRecords: [{ measure: 'm', owner: 'o', executedAt: NOW }],
      check: { before: { sampleSize: 120, rate: 4.2 }, after: { sampleSize: 130, rate: 1.2 } },
    });
    const e = calculatePDCAEffect(p);
    // after 1.2 <= goal 1.5 → 达标
    expect(e.verdict).toBe('met');
    expect(e.absoluteDelta).toBeCloseTo(-3.0, 3);
    // (4.2-1.2)/4.2 = 71.43%
    expect(e.improvementPct).toBeCloseTo(71.43, 1);
    // 目标差距关闭率：(4.2-1.2)/(4.2-1.5) = 3.0/2.7 ≈ 1.111
    expect(e.goalAttainment).toBeCloseTo(1.111, 2);
    expect(e.underpowered).toBe(false);
    expect(e.summary).toContain('跌倒发生率');
  });

  it('lower_better：率值几乎没动 → missed', () => {
    const p = makeProject({
      phase: 'Check',
      check: { before: { sampleSize: 200, rate: 4.2 }, after: { sampleSize: 200, rate: 4.0 } },
    });
    const e = calculatePDCAEffect(p);
    expect(e.verdict).toBe('missed');
    expect(e.improvementPct).toBeCloseTo(4.76, 1);
  });

  it('样本量任一侧 <30 时标记 underpowered，不夸大结论', () => {
    const p = makeProject({
      phase: 'Check',
      check: { before: { sampleSize: 12, rate: 4.2 }, after: { sampleSize: 40, rate: 1.0 } },
    });
    const e = calculatePDCAEffect(p);
    expect(e.underpowered).toBe(true);
    expect(e.summary).toContain('样本量不足');
  });

  it('higher_better（如手卫生合规率）：上升且达标 → met', () => {
    const p = createPDCAProject(
      '提升手卫生合规率',
      '普外科',
      '李护士长',
      {
        metric: '手卫生合规率',
        unit: '%',
        direction: 'higher_better',
        baseline: 60,
        goal: 90,
      },
      { id: 'pdca_hb', now: NOW },
    );
    p.phase = 'Check';
    p.check = { before: { sampleSize: 300, rate: 60 }, after: { sampleSize: 320, rate: 92 } };
    const e = calculatePDCAEffect(p);
    expect(e.verdict).toBe('met');
    // (92-60)/60 = 53.33%
    expect(e.improvementPct).toBeCloseTo(53.33, 1);
    expect(e.absoluteDelta).toBeCloseTo(32, 3);
  });

  it('未采集 before/after 时抛错，不返回空壳', () => {
    const p = makeProject();
    expect(() => calculatePDCAEffect(p)).toThrow(/before\/after/);
  });
});
