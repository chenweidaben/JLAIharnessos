/**
 * 健澜科技 jlmedaios - 【AI深化与智能运营】患者全旅程纯函数单测
 *
 * 覆盖：
 *   - buildPatientJourney：八节点时间线/等待累计/时段过滤/断环识别/不修改入参；
 *   - identifyJourneyBottleneck：超基准才上报、严重度分档、按超出量排序；
 *   - optimizePatientFlow：可释放等待估算、顺畅流程走兜底建议；
 *   - predictPatientSatisfaction：等待扣分/断环扣分/随访加分/无数据不硬猜。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  SEED_JOURNEY_EVENTS,
  buildPatientJourney,
  identifyJourneyBottleneck,
  optimizePatientFlow,
  predictPatientSatisfaction,
  type PatientJourneyEvent,
  type JourneyPeriod,
} from '../../src/bff/aggregators/patientJourneyAggregator';

/** 演示时段：2026 年 10 月（种子事件全部落在该区间） */
const OCT: JourneyPeriod = { from: '2026-10-01T00:00:00+08:00', to: '2026-10-31T23:59:59+08:00' };
/** 区间外时段：什么都查不到 */
const NOV: JourneyPeriod = { from: '2026-11-01T00:00:00+08:00', to: '2026-11-30T23:59:59+08:00' };

/** 便捷工厂：构造一个节点事件 */
function ev(over: Partial<PatientJourneyEvent> & Pick<PatientJourneyEvent, 'patientId' | 'nodeCode' | 'occurredAt'>): PatientJourneyEvent {
  return {
    eventId: over.eventId ?? `ev-${over.patientId}-${over.nodeCode}`,
    visitId: over.visitId ?? 'V-X',
    waitMinutes: 0,
    durationMinutes: 5,
    status: 'completed',
    ...over,
  };
}

describe('buildPatientJourney 全旅程时间线', () => {
  it('八节点固定顺序，演示患者 A 全部到达', () => {
    const j = buildPatientJourney('P-2026101201', OCT);
    expect(j.stages.length).toBe(8);
    expect(j.stages.map((s) => s.nodeCode)).toEqual([
      'appointment', 'triaging', 'consultation', 'billing',
      'exam', 'pharmacy', 'discharge', 'followup',
    ]);
    expect(j.reachedCount).toBe(8);
    expect(j.completedCount).toBe(8);
  });

  it('累计等待 = 各节点等待之和（0+40+0+8+65+12+0+0=125）', () => {
    const j = buildPatientJourney('P-2026101201', OCT);
    expect(j.totalWaitMinutes).toBe(125);
  });

  it('随访已完成闭环', () => {
    const j = buildPatientJourney('P-2026101201', OCT);
    expect(j.followupCompleted).toBe(true);
  });

  it('演示患者 B 无随访登记：followup 节点未到达', () => {
    const j = buildPatientJourney('P-2026101301', OCT);
    expect(j.reachedCount).toBe(7);
    expect(j.followupCompleted).toBe(false);
    // 首末到达节点之间无断环（followup 在 discharge 之后，不计入断环）
    expect(j.skippedBetween).toEqual([]);
  });

  it('时段过滤：区间外查不到任何节点', () => {
    const j = buildPatientJourney('P-2026101201', NOV);
    expect(j.reachedCount).toBe(0);
    expect(j.stages.every((s) => !s.reached)).toBe(true);
  });

  it('不修改入参事件列表', () => {
    const snapshot = SEED_JOURNEY_EVENTS.map((e) => ({ ...e }));
    buildPatientJourney('P-2026101201', OCT);
    expect(SEED_JOURNEY_EVENTS).toEqual(snapshot);
  });
});

describe('identifyJourneyBottleneck 瓶颈识别', () => {
  it('只上报超基准节点，按超出量从大到小排序', () => {
    const r = identifyJourneyBottleneck('P-2026101201', OCT);
    // 候诊 40(基准30,超10) / 缴费 8(基准10,不超) / 检查 65(基准45,超20) / 取药 12(基准10,超2)
    expect(r.bottlenecks.map((b) => b.nodeCode)).toEqual(['exam', 'triaging', 'pharmacy']);
    expect(r.summary.overBenchmarkCount).toBe(3);
  });

  it('检查检验等待 65 分钟 ≥60，判定 high 严重度', () => {
    const r = identifyJourneyBottleneck('P-2026101201', OCT);
    expect(r.worstNode?.nodeCode).toBe('exam');
    expect(r.worstNode?.severity).toBe('high');
    expect(r.worstNode?.excessMinutes).toBe(20);
  });

  it('候诊超基准 10 分钟但未达 1 倍，判 medium', () => {
    const r = identifyJourneyBottleneck('P-2026101201', OCT);
    const t = r.bottlenecks.find((b) => b.nodeCode === 'triaging');
    expect(t?.severity).toBe('medium');
    expect(t?.excessMinutes).toBe(10);
  });

  it('等待 60 分钟整即触发 high（绝对等待红线）', () => {
    const events = [
      ev({ patientId: 'P-X', nodeCode: 'appointment', occurredAt: '2026-10-20T08:00:00+08:00' }),
      ev({ patientId: 'P-X', nodeCode: 'triaging', occurredAt: '2026-10-20T08:30:00+08:00', waitMinutes: 60 }),
    ];
    const r = identifyJourneyBottleneck('P-X', OCT, events);
    expect(r.bottlenecks[0].nodeCode).toBe('triaging');
    expect(r.bottlenecks[0].severity).toBe('high');
  });

  it('顺畅流程（演示患者 B）无瓶颈', () => {
    const r = identifyJourneyBottleneck('P-2026101301', OCT);
    expect(r.bottlenecks).toEqual([]);
    expect(r.worstNode).toBeNull();
  });
});

describe('optimizePatientFlow 流程优化', () => {
  it('超基准节点给出优化动作，按 60% 口径估算可释放等待', () => {
    const j = buildPatientJourney('P-2026101201', OCT);
    const opt = optimizePatientFlow(j);
    // exam 超 20 → 释放 12；triaging 超 10 → 释放 6；pharmacy 超 2 → 释放 1
    expect(opt.totalEstimatedWaitSavedMinutes).toBe(19);
    expect(opt.overallPriority).toBe('high');
    const exam = opt.recommendations.find((r) => r.nodeCode === 'exam');
    expect(exam?.estimatedWaitSavedMinutes).toBe(12);
    expect(exam?.action).toContain('集中预约');
  });

  it('顺畅流程走兜底建议，不硬造优化项', () => {
    const j = buildPatientJourney('P-2026101301', OCT);
    const opt = optimizePatientFlow(j);
    expect(opt.totalEstimatedWaitSavedMinutes).toBe(0);
    expect(opt.overallPriority).toBe('low');
    expect(opt.recommendations[0].action).toContain('保持');
  });
});

describe('predictPatientSatisfaction 满意度预测', () => {
  it('演示患者 A：等待扣分+在院超时扣分，随访闭环回补，得 85 分', () => {
    const j = buildPatientJourney('P-2026101201', OCT);
    const s = predictPatientSatisfaction(j);
    // 100 - 候诊超10*0.5(5) - 检查超20*0.5(10) - 取药超2*0.5(1) - 在院超4h(5) + 随访(6) = 85
    expect(s.predictedScore).toBe(85);
    expect(s.level).toBe('excellent');
    expect(s.risk).toBe('low');
    expect(s.confidence).toBe('high');
    expect(s.negativeFactors.some((f) => f.includes('候诊'))).toBe(true);
  });

  it('演示患者 B：等待全在基准内，但随访未完成留扣分项，得 100 分', () => {
    const j = buildPatientJourney('P-2026101301', OCT);
    const s = predictPatientSatisfaction(j);
    expect(s.predictedScore).toBe(100);
    expect(s.level).toBe('excellent');
    expect(s.negativeFactors.some((f) => f.includes('随访未完成'))).toBe(true);
  });

  it('流程断环：首末节点之间缺「就诊」扣 8 分', () => {
    const events = [
      ev({ patientId: 'P-Y', nodeCode: 'appointment', occurredAt: '2026-10-20T08:00:00+08:00' }),
      ev({ patientId: 'P-Y', nodeCode: 'triaging', occurredAt: '2026-10-20T08:30:00+08:00', waitMinutes: 20 }),
      // 故意缺 consultation
      ev({ patientId: 'P-Y', nodeCode: 'billing', occurredAt: '2026-10-20T09:00:00+08:00', waitMinutes: 5 }),
    ];
    const j = buildPatientJourney('P-Y', OCT, events);
    expect(j.skippedBetween).toEqual(['consultation']);
    const s = predictPatientSatisfaction(j);
    // 100 - 断环 8 = 92（候诊 20≤30、缴费 5≤10 不扣分；无随访不加分）
    expect(s.predictedScore).toBe(92);
    expect(s.confidence).toBe('low'); // 已完成 3 节点（<5 → low）
  });

  it('无旅程数据不硬猜：返回 unknown 与低置信', () => {
    const j = buildPatientJourney('nobody', OCT, []);
    expect(j.reachedCount).toBe(0);
    const s = predictPatientSatisfaction(j);
    expect(s.level).toBe('unknown');
    expect(s.predictedScore).toBe(0);
    expect(s.confidence).toBe('low');
  });
});
