/**
 * 健澜科技 jlmedaios - 互联网医院在线问诊纯函数单测（M143-A · 互联网医院与远程医疗）
 *
 * 覆盖：
 *   - createConsultation：三模式组包、待接单状态、入参校验；
 *   - acceptConsultation：待接单→咨询中、锁定医师、30 分钟 deadlineAt 起算、
 *     重复接单 / 已结束单拒绝；
 *   - endConsultation：咨询中→已结束、回写 summary 与 durationSec、
 *     空小结拒绝、状态机拦截；
 *   - sweepTimeouts：咨询中超 30 分钟自动标记 endReason=timeout 关单；
 *   - cancelConsultation：待接单→已取消。
 *
 * 与持久化解耦：不触库（persistConsult 由路由层显式调用，单测不覆盖）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  acceptConsultation,
  cancelConsultation,
  CONSULT_TIMEOUT_MINUTES,
  createConsultation,
  endConsultation,
  resetConsultLedger,
  sweepTimeouts,
} from '../../src/bff/aggregators/onlineConsultAggregator';

beforeEach(() => resetConsultLedger());

describe('createConsultation 发起问诊', () => {
  it('创建后进入待接单，记录科室/症状/模式', () => {
    const c = createConsultation('P1001', '', '呼吸内科', '咳嗽 3 天，低热', 'image', '2026-10-16T08:00:00Z');
    expect(c.status).toBe('pending');
    expect(c.doctorId).toBeNull();
    expect(c.dept).toBe('呼吸内科');
    expect(c.symptoms).toBe('咳嗽 3 天，低热');
    expect(c.mode).toBe('image');
    expect(c.id).toBeTruthy();
    expect(c.deadlineAt).toBeNull();
    expect(c.durationSec).toBeNull();
  });

  it('mode 缺省按文字咨询处理；非法模式在路由层收敛（此处默认 text）', () => {
    const c = createConsultation('P1002', 'D1', '全科', '乏力');
    expect(c.mode).toBe('text');
    expect(c.doctorId).toBe('D1');
  });

  it('入参非法抛错：患者/科室/症状为空', () => {
    expect(() => createConsultation('', 'D1', '全科', '头痛')).toThrow();
    expect(() => createConsultation('P1', 'D1', '', '头痛')).toThrow();
    expect(() => createConsultation('P1', 'D1', '全科', '  ')).toThrow();
  });
});

describe('acceptConsultation 医师接单', () => {
  it('待接单→咨询中，锁定医师并起算 30 分钟倒计时', () => {
    const c = createConsultation('P2001', '', '心内科', '胸闷', 'text', '2026-10-16T08:00:00Z');
    const a = acceptConsultation(c.id, 'D301', '2026-10-16T08:05:00Z');
    expect(a.status).toBe('ongoing');
    expect(a.doctorId).toBe('D301');
    expect(a.acceptedAt).toBe('2026-10-16T08:05:00.000Z');
    // deadline = accepted + 30min = 08:35
    expect(a.deadlineAt).toBe('2026-10-16T08:35:00.000Z');
    expect(new Date(a.deadlineAt!).getTime() - new Date(a.acceptedAt!).getTime()).toBe(CONSULT_TIMEOUT_MINUTES * 60_000);
  });

  it('重复接单 / 接已结束单抛错', () => {
    const c = createConsultation('P2002', '', '全科', '头晕');
    acceptConsultation(c.id, 'D1', '2026-10-16T08:00:00Z');
    expect(() => acceptConsultation(c.id, 'D2')).toThrow(); // 已是 ongoing
    expect(() => acceptConsultation('not-exist', 'D1')).toThrow();
    expect(() => acceptConsultation(c.id, '')).toThrow(); // 医师工号必填
  });
});

describe('endConsultation 结束问诊', () => {
  it('咨询中→已结束，回写小结与实际时长', () => {
    const c = createConsultation('P3001', '', '全科', '流涕', 'video', '2026-10-16T08:00:00Z');
    acceptConsultation(c.id, 'D9', '2026-10-16T08:10:00Z');
    const e = endConsultation(c.id, '多饮温水，必要时复诊', '2026-10-16T08:25:00Z');
    expect(e.status).toBe('ended');
    expect(e.endReason).toBe('completed');
    expect(e.summary).toBe('多饮温水，必要时复诊');
    expect(e.durationSec).toBe(15 * 60); // 10:10 → 10:25
  });

  it('空小结拒绝结束；非咨询中状态拒绝', () => {
    const pending = createConsultation('P3002', '', '全科', '失眠');
    expect(() => endConsultation(pending.id, '小结')).toThrow(); // 待接单不可结束

    const c = createConsultation('P3003', '', '全科', '失眠');
    acceptConsultation(c.id, 'D1', '2026-10-16T08:00:00Z');
    expect(() => endConsultation(c.id, '   ')).toThrow(); // 小结必填
  });
});

describe('sweepTimeouts 30 分钟超时自动关单', () => {
  it('咨询中超 30 分钟未结束 → 自动标记 timeout 并回写时长', () => {
    const c = createConsultation('P4001', '', '全科', '咽痛', 'text', '2026-10-16T08:00:00Z');
    acceptConsultation(c.id, 'D7', '2026-10-16T08:10:00Z'); // deadline 08:40

    // 08:39 仍在窗口内：不超时
    const early = sweepTimeouts('2026-10-16T08:39:59Z');
    expect(early).toHaveLength(0);

    // 08:40:01 越过 deadline：自动关单
    const closed = sweepTimeouts('2026-10-16T08:40:01Z');
    expect(closed).toHaveLength(1);
    expect(closed[0].status).toBe('ended');
    expect(closed[0].endReason).toBe('timeout');
    expect(closed[0].endedAt).toBe('2026-10-16T08:40:01.000Z');
    expect(closed[0].durationSec).toBeGreaterThanOrEqual(30 * 60);
  });

  it('结束前再调 endConsultation：已超时单直接返回 timeout 结果，不再要求小结', () => {
    const c = createConsultation('P4002', '', '全科', '皮疹');
    acceptConsultation(c.id, 'D2', '2026-10-16T08:00:00Z');
    // 越 30 分钟后，医师点「结束」——内部先 sweep，自动判 timeout
    const e = endConsultation(c.id, '', '2026-10-16T09:00:00Z');
    expect(e.status).toBe('ended');
    expect(e.endReason).toBe('timeout');
    expect(e.summary).toBeNull();
  });
});

describe('cancelConsultation 患者撤单', () => {
  it('待接单→已取消；已被接走的单不可取消', () => {
    const c = createConsultation('P5001', '', '全科', '胃部不适');
    const x = cancelConsultation(c.id, '2026-10-16T09:00:00Z');
    expect(x.status).toBe('cancelled');

    const c2 = createConsultation('P5002', '', '全科', '胃痛');
    acceptConsultation(c2.id, 'D1');
    expect(() => cancelConsultation(c2.id)).toThrow();
  });
});
