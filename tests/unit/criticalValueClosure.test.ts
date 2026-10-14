/**
 * 健澜科技 jlmedaios - 危急值闭环升级状态机单测（216）
 *
 * closureState 纯函数：pending -> notified -> accepted -> processed -> closed。
 * 状态由时间戳推导，view 函数校验转移白名单并产出下一步记录。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  acceptView,
  ClosureError,
  CLOSURE_TRANSITIONS,
  closeView,
  closureState,
  processView,
  type ClosureStage,
} from '../../src/bff/aggregators/criticalValueClosureAggregator.js';
import type { CriticalClosure } from '../../src/db/repositories/criticalValueRepo.js';

/** 造一条指定时间戳留痕记录（其余字段为 null）。 */
function make(partial: Partial<Omit<CriticalClosure, 'id'>> = {}): CriticalClosure {
  return {
    id: 'cv-test',
    notifiedAt: null,
    doctorAcceptedAt: null,
    doctorAcceptedBy: null,
    processedAt: null,
    processedBy: null,
    processedNote: null,
    closedAt: null,
    closedBy: null,
    ...partial,
  };
}

const T0 = '2026-10-14T08:00:00.000Z';
const T1 = '2026-10-14T08:05:00.000Z';
const T2 = '2026-10-14T08:10:00.000Z';
const T3 = '2026-10-14T08:15:00.000Z';

describe('closureState：由时间戳推导闭环状态', () => {
  it('无任何时间戳 => pending（报告已生成待通知）', () => {
    expect(closureState(make())).toBe('pending');
  });
  it('仅有 notified_at => notified（已通知医生）', () => {
    expect(closureState(make({ notifiedAt: T0 }))).toBe('notified');
  });
  it('已有 doctor_accepted_at => accepted（医生已接收）', () => {
    expect(closureState(make({ notifiedAt: T0, doctorAcceptedAt: T1 }))).toBe('accepted');
  });
  it('已有 processed_at => processed（已记录处理时间）', () => {
    expect(closureState(make({
      notifiedAt: T0, doctorAcceptedAt: T1, processedAt: T2,
    }))).toBe('processed');
  });
  it('已有 closed_at => closed（闭环）', () => {
    expect(closureState(make({
      notifiedAt: T0, doctorAcceptedAt: T1, processedAt: T2, closedAt: T3,
    }))).toBe('closed');
  });
  it('后段时间戳优先于前段（时间戳即状态，单调前进）', () => {
    // 即便前置时间戳缺失，写入 closed_at 即闭环
    expect(closureState(make({ closedAt: T3 }))).toBe('closed');
    expect(closureState(make({ doctorAcceptedAt: T1, closedAt: T3 }))).toBe('closed');
    expect(closureState(make({ notifiedAt: T0, processedAt: T2 }))).toBe('processed');
  });
});

describe('CLOSURE_TRANSITIONS：单向白名单', () => {
  it('主链路 pending->notified->accepted->processed->closed', () => {
    expect(CLOSURE_TRANSITIONS.pending).toContain('notified');
    expect(CLOSURE_TRANSITIONS.notified).toContain('accepted');
    expect(CLOSURE_TRANSITIONS.accepted).toContain('processed');
    expect(CLOSURE_TRANSITIONS.processed).toContain('closed');
  });
  it('closed 为终态，不可再转', () => {
    expect(CLOSURE_TRANSITIONS.closed).toHaveLength(0);
  });
  it('不允许跳段与回退', () => {
    expect(CLOSURE_TRANSITIONS.pending).not.toContain('accepted');
    expect(CLOSURE_TRANSITIONS.notified).not.toContain('processed');
    expect(CLOSURE_TRANSITIONS.accepted).not.toContain('closed');
    expect(CLOSURE_TRANSITIONS.processed).not.toContain('accepted');
  });
});

describe('acceptView：医生接收 notified -> accepted', () => {
  it('写入 doctor_accepted_at / doctor_accepted_by 且状态前进', () => {
    const r = make({ notifiedAt: T0 });
    const next = acceptView(r, 'doc-1', T1);
    expect(next.doctorAcceptedAt).toBe(T1);
    expect(next.doctorAcceptedBy).toBe('doc-1');
    expect(closureState(next)).toBe('accepted');
  });
  it('pending 状态不可接收（须先通知医生）', () => {
    expect(() => acceptView(make(), 'doc-1')).toThrow(ClosureError);
  });
  it('已接收后不可重复接收', () => {
    expect(() =>
      acceptView(make({ notifiedAt: T0, doctorAcceptedAt: T1 }), 'doc-1'),
    ).toThrow(/不可执行/);
  });
});

describe('processView：记录处理时间 accepted -> processed', () => {
  const accepted = () => make({ notifiedAt: T0, doctorAcceptedAt: T1 });
  it('写入 processed_at / processed_by / 处置记录', () => {
    const next = processView(accepted(), 'doc-1', '已床旁复查并调整医嘱', T2);
    expect(next.processedAt).toBe(T2);
    expect(next.processedBy).toBe('doc-1');
    expect(next.processedNote).toBe('已床旁复查并调整医嘱');
    expect(closureState(next)).toBe('processed');
  });
  it('处置记录为空抛 400', () => {
    expect(() => processView(accepted(), 'doc-1', '   ')).toThrow(ClosureError);
  });
  it('非 accepted 状态不可记录处理时间', () => {
    expect(() => processView(make({ notifiedAt: T0 }), 'doc-1', 'note')).toThrow(ClosureError);
  });
});

describe('closeView：闭环 processed -> closed', () => {
  const processed = () => make({
    notifiedAt: T0, doctorAcceptedAt: T1, processedAt: T2, processedBy: 'doc-1',
    processedNote: '处理完毕',
  });
  it('写入 closed_at / closed_by', () => {
    const next = closeView(processed(), 'doc-1', T3);
    expect(next.closedAt).toBe(T3);
    expect(next.closedBy).toBe('doc-1');
    expect(closureState(next)).toBe('closed');
  });
  it('未记录处理时间不可直接闭环', () => {
    expect(() => closeView(make({ notifiedAt: T0, doctorAcceptedAt: T1 }), 'doc-1'))
      .toThrow(ClosureError);
  });
  it('闭环为终态，重复闭环抛 409', () => {
    expect(() => closeView(processed(), 'doc-1')).not.toThrow();
    const closed = { ...processed(), closedAt: T3, closedBy: 'doc-1' };
    expect(() => closeView(closed, 'doc-1')).toThrow(ClosureError);
  });
});

describe('全链路：报告 -> 通知 -> 接收 -> 处理 -> 闭环', () => {
  it('acceptView/processView/closeView 串联得到 closed', () => {
    let r = make({ notifiedAt: T0 });
    expect(closureState(r)).toBe<ClosureStage>('notified');
    r = acceptView(r, 'doc-1', T1);
    r = processView(r, 'doc-1', '复查心电图，补钾', T2);
    r = closeView(r, 'doc-1', T3);
    expect(closureState(r)).toBe('closed');
    expect(r.notifiedAt).toBe(T0);
    expect(r.doctorAcceptedAt).toBe(T1);
    expect(r.processedAt).toBe(T2);
    expect(r.closedAt).toBe(T3);
  });
});
