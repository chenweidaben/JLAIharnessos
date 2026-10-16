/**
 * 健澜科技 jlmedaios - 输血不良反应闭环 SLA 单测（M182-A）
 *
 * 覆盖：闭环跟踪（状态由时间戳推导）、超时升级（20h 提醒 / 24h 升级）、
 * SLA 计算（elapsed/remaining/deadline）、闭环修复（五段齐全 + 合规判定）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  CLOSURE_SLA_MS,
  closureState,
  ESCALATE_THRESHOLD_MS,
  fixTransfusionReactionClosure,
  REMIND_THRESHOLD_MS,
  summarizeClosureSLA,
  trackTransfusionClosureSLA,
  type TransfusionClosureRecord,
} from '../../src/bff/aggregators/bloodClosureSlaAggregator.js';

/** 上报锚点：2026-10-16T08:00:00Z。 */
const T0 = new Date('2026-10-16T08:00:00.000Z');
const H = 3600000;

function rec(partial: Partial<TransfusionClosureRecord> = {}): TransfusionClosureRecord {
  return {
    transfusionId: 'TXN-TEST',
    patientId: 'P-TEST',
    reactionType: 'fever',
    severity: 'mild',
    reportedAt: T0.toISOString(),
    assessedAt: null,
    treatedAt: null,
    recordedAt: null,
    summarizedAt: null,
    closedAt: null,
    responsibleDoctorId: 'DR-王',
    ...partial,
  };
}

describe('closureState：闭环阶段由时间戳推导', () => {
  it('仅上报 => reported', () => {
    expect(closureState(rec())).toBe('reported');
  });
  it('逐段前进 assessed -> treated -> recorded -> summarized -> closed', () => {
    expect(closureState(rec({ assessedAt: 'x' }))).toBe('assessed');
    expect(closureState(rec({ assessedAt: 'x', treatedAt: 'x' }))).toBe('treated');
    expect(closureState(rec({ assessedAt: 'x', treatedAt: 'x', recordedAt: 'x' }))).toBe('recorded');
    expect(closureState(rec({
      assessedAt: 'x', treatedAt: 'x', recordedAt: 'x', summarizedAt: 'x',
    }))).toBe('summarized');
    expect(closureState(rec({ closedAt: 'x' }))).toBe('closed');
  });
});

describe('trackTransfusionClosureSLA：SLA 时间计算', () => {
  it('deadline = 上报 + 24h，remind = 上报 + 20h', () => {
    const s = trackTransfusionClosureSLA(rec(), new Date(T0.getTime() + 5 * H));
    expect(new Date(s.deadlineAt).getTime()).toBe(T0.getTime() + CLOSURE_SLA_MS);
    expect(new Date(s.remindAt).getTime()).toBe(T0.getTime() + REMIND_THRESHOLD_MS);
    expect(s.elapsedMs).toBe(5 * H);
    expect(s.remainingMs).toBe(19 * H);
  });

  it('5h 未闭环 => ON_TRACK（在途）', () => {
    const s = trackTransfusionClosureSLA(rec(), new Date(T0.getTime() + 5 * H));
    expect(s.action).toBe('ON_TRACK');
    expect(s.isClosed).toBe(false);
  });

  it('20h 临界点提醒阈值为 20h；21h 未闭环 => REMIND_DOCTOR', () => {
    const s = trackTransfusionClosureSLA(rec(), new Date(T0.getTime() + 21 * H));
    expect(s.action).toBe('REMIND_DOCTOR');
    expect(s.message).toContain('提醒责任医生');
  });

  it('24h 未闭环 => ESCALATE_DIRECTOR（升级输血科主任）', () => {
    const s = trackTransfusionClosureSLA(rec(), new Date(T0.getTime() + 26 * H));
    expect(s.action).toBe('ESCALATE_DIRECTOR');
    expect(s.remainingMs).toBeLessThan(0); // 已超时
    expect(s.message).toContain('升级');
  });

  it('8h 内闭环 => CLOSED_MET（按时）', () => {
    const r = rec({
      assessedAt: new Date(T0.getTime() + 1 * H).toISOString(),
      treatedAt: new Date(T0.getTime() + 2 * H).toISOString(),
      recordedAt: new Date(T0.getTime() + 3 * H).toISOString(),
      summarizedAt: new Date(T0.getTime() + 7 * H).toISOString(),
      closedAt: new Date(T0.getTime() + 8 * H).toISOString(),
    });
    const s = trackTransfusionClosureSLA(r, new Date(T0.getTime() + 30 * H));
    expect(s.action).toBe('CLOSED_MET');
    expect(s.closedOnTime).toBe(true);
  });

  it('26h 才闭环 => CLOSED_BREACH（超时闭环，计入风险）', () => {
    const r = rec({ closedAt: new Date(T0.getTime() + 26 * H).toISOString() });
    const s = trackTransfusionClosureSLA(r, new Date(T0.getTime() + 30 * H));
    expect(s.action).toBe('CLOSED_BREACH');
    expect(s.closedOnTime).toBe(false);
  });
});

describe('fixTransfusionReactionClosure：闭环修复与合规判定', () => {
  it('五段齐全且按时闭环 => slaCompliant，无补齐动作', () => {
    const r = rec({
      assessedAt: new Date(T0.getTime() + 1 * H).toISOString(),
      treatedAt: new Date(T0.getTime() + 2 * H).toISOString(),
      recordedAt: new Date(T0.getTime() + 3 * H).toISOString(),
      summarizedAt: new Date(T0.getTime() + 7 * H).toISOString(),
      closedAt: new Date(T0.getTime() + 8 * H).toISOString(),
    });
    const fix = fixTransfusionReactionClosure(r, new Date(T0.getTime() + 30 * H));
    expect(fix.closedLoopComplete).toBe(true);
    expect(fix.slaCompliant).toBe(true);
    expect(fix.requiredActions).toHaveLength(0);
  });

  it('缺「处置/记录/总结」=> 列出补齐动作；未闭环 => 追加截止与提醒动作', () => {
    const r = rec({ assessedAt: new Date(T0.getTime() + 1 * H).toISOString() });
    const fix = fixTransfusionReactionClosure(r, new Date(T0.getTime() + 21 * H));
    expect(fix.closedLoopComplete).toBe(false);
    expect(fix.slaCompliant).toBe(false);
    expect(fix.requiredActions).toContain('补全「处置」留痕（TXN-TEST）');
    expect(fix.requiredActions).toContain('补全「记录」留痕（TXN-TEST）');
    expect(fix.requiredActions).toContain('补全「总结」留痕（TXN-TEST）');
    expect(fix.requiredActions.some((a) => a.includes('提醒责任医生'))).toBe(true);
  });

  it('24h 未闭环 => 升级动作入清单', () => {
    const fix = fixTransfusionReactionClosure(rec(), new Date(T0.getTime() + 26 * H));
    expect(fix.requiredActions.some((a) => a.includes('升级输血科主任'))).toBe(true);
  });

  it('五段齐全但超时闭环 => slaCompliant=false', () => {
    const r = rec({
      assessedAt: new Date(T0.getTime() + 1 * H).toISOString(),
      treatedAt: new Date(T0.getTime() + 2 * H).toISOString(),
      recordedAt: new Date(T0.getTime() + 3 * H).toISOString(),
      summarizedAt: new Date(T0.getTime() + 25 * H).toISOString(),
      closedAt: new Date(T0.getTime() + 26 * H).toISOString(),
    });
    const fix = fixTransfusionReactionClosure(r, new Date(T0.getTime() + 30 * H));
    expect(fix.closedLoopComplete).toBe(true);
    expect(fix.slaCompliant).toBe(false);
  });
});

describe('summarizeClosureSLA：闭环率大盘', () => {
  it('闭环率 = 按时闭环 / 总数；统计提醒与升级计数', () => {
    const closedOnTime = rec({
      transfusionId: 'A',
      assessedAt: 'x', treatedAt: 'x', recordedAt: 'x', summarizedAt: 'x',
      closedAt: new Date(T0.getTime() + 8 * H).toISOString(),
    });
    const breach = rec({
      transfusionId: 'B',
      assessedAt: 'x', treatedAt: 'x', recordedAt: 'x', summarizedAt: 'x',
      closedAt: new Date(T0.getTime() + 26 * H).toISOString(),
    });
    // C：上报于 T0+5h，至 now(T0+26h) 已用 21h => REMIND
    const remind = rec({
      transfusionId: 'C',
      reportedAt: new Date(T0.getTime() + 5 * H).toISOString(),
      assessedAt: 'x',
    });
    const escalate = rec({ transfusionId: 'D' });
    const { summary } = summarizeClosureSLA(
      [closedOnTime, breach, remind, escalate],
      new Date(T0.getTime() + 26 * H),
    );
    expect(summary.total).toBe(4);
    expect(summary.compliantCount).toBe(1);
    expect(summary.breachCount).toBe(1);
    expect(summary.remindCount).toBe(1);
    expect(summary.escalateCount).toBe(1);
    expect(summary.closureRatePct).toBe(25); // 1/4
  });
});
