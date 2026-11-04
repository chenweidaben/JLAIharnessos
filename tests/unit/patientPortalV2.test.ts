/**
 * 健澜AI原生医院操作系统OS - P3-1 患者互联网+服务门户 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore, PortalError,
  listReports, markReportRead,
  createBooking, listBookings, cancelBooking,
  submitSatisfaction,
  listReminders, markReminderRead,
  listPayments, listAdminNotifs, seed,
} from '../../src/bff/aggregators/patientPortalV2Aggregator';

beforeEach(() => { __resetStore(); });

const FUTURE = () => new Date(Date.now() + 7 * 86400 * 1000).toISOString();

describe('P3-1 报告', () => {
  test('seed 灌报告 + listReports 过滤 type', () => {
    seed('P1', {
      reports: [
        { visitId: 'V1', type: 'lab', title: '血常规', result: 'WBC 6.5', issuedAt: '2026-11-04T08:00:00Z' },
        { visitId: 'V1', type: 'imaging', title: '胸片', result: '未见异常', issuedAt: '2026-11-04T09:00:00Z' },
      ],
    });
    expect(listReports('P1', {}).length).toBe(2);
    expect(listReports('P1', { type: 'lab' }).length).toBe(1);
  });
  test('markReportRead 幂等', () => {
    seed('P1', { reports: [{ visitId: 'V1', type: 'lab', title: 'x', result: 'y', issuedAt: '2026-11-04T08:00:00Z' }] });
    const id = listReports('P1', {})[0].reportId;
    const r1 = markReportRead('P1', id);
    expect(r1.readAt).toBeTruthy();
    const r2 = markReportRead('P1', id);
    expect(r2.readAt).toBe(r1.readAt);
  });
  test('非法 type → 400', () => {
    expect(() => listReports('P1', { type: 'xray' as any })).toThrow(/type/);
  });
});

describe('P3-1 图文咨询预约', () => {
  test('创建 booking 自动生成 in-app reminder', () => {
    const b = createBooking({ patientId: 'P1', doctorId: 'D1', departmentId: '内科', scheduledAt: FUTURE() });
    expect(b.status).toBe('booked');
    expect(listReminders('P1').length).toBe(1);
  });
  test('scheduledAt 过去时间 → 400', () => {
    expect(() => createBooking({ patientId: 'P1', doctorId: 'D1', departmentId: 'x', scheduledAt: '2020-01-01T00:00:00Z' })).toThrow(/未来/);
  });
  test('取消 booking；重复取消 → 409', () => {
    const b = createBooking({ patientId: 'P1', doctorId: 'D1', departmentId: 'x', scheduledAt: FUTURE() });
    expect(cancelBooking('P1', b.bookingId).status).toBe('cancelled');
    expect(() => cancelBooking('P1', b.bookingId)).toThrow(/重复取消/);
  });
  test('listBookings 倒序', () => {
    createBooking({ patientId: 'P1', doctorId: 'D1', departmentId: 'x', scheduledAt: FUTURE() });
    createBooking({ patientId: 'P1', doctorId: 'D2', departmentId: 'y', scheduledAt: FUTURE() });
    expect(listBookings('P1').length).toBe(2);
  });
});

function Timeline409(e: unknown): boolean { return e instanceof PortalError && e.status === 409; }

describe('P3-1 满意度', () => {
  test('正常提交 + 低分触发 admin 通知', () => {
    submitSatisfaction({ patientId: 'P1', visitId: 'V1', doctorId: 'D1', score: 2, comment: '等待太久' });
    expect(listAdminNotifs().length).toBe(1);
  });
  test('score>5 → 400', () => {
    expect(() => submitSatisfaction({ patientId: 'P1', visitId: 'V1', doctorId: 'D1', score: 6 })).toThrow(/score/);
  });
  test('同 visitId 重复提交 → 409', () => {
    submitSatisfaction({ patientId: 'P1', visitId: 'V1', doctorId: 'D1', score: 4 });
    expect(() => submitSatisfaction({ patientId: 'P1', visitId: 'V1', doctorId: 'D1', score: 5 })).toThrow(/重复提交/);
  });
});

describe('P3-1 提醒/缴费', () => {
  test('listReminders + markReminderRead', () => {
    seed('P1', { reminders: [{ channel: 'sms', triggerAt: '2026-11-05T08:00:00Z', message: 'x' }] });
    const id = listReminders('P1')[0].reminderId;
    expect(markReminderRead('P1', id).status).toBe('read');
  });
  test('非法 channel seed → 400', () => {
    expect(() => seed('P1', { reminders: [{ channel: 'email' as any, triggerAt: 'x', message: 'x' }] })).toThrow(/channel/);
  });
  test('payments 列表', () => {
    seed('P1', { payments: [{ visitId: 'V1', amountTotal: 100, insuranceCovered: 60, patientPaid: 40, paidAt: '2026-11-04T10:00:00Z', method: 'wechat' }] });
    expect(listPayments('P1').length).toBe(1);
  });
});

describe('P3-1 越权', () => {
  test('markReportRead 别人 → 403', () => {
    seed('P1', { reports: [{ visitId: 'V1', type: 'lab', title: 'x', result: 'y', issuedAt: '2026-11-04T08:00:00Z' }] });
    const id = listReports('P1', {})[0].reportId;
    try { markReportRead('P2', id); expect(true).toBe(false); } catch (e) { expect((e as PortalError).status).toBe(403); }
  });
  test('取消别人 booking → 403', () => {
    const b = createBooking({ patientId: 'P1', doctorId: 'D1', departmentId: 'x', scheduledAt: FUTURE() });
    expect(() => cancelBooking('P2', b.bookingId)).toThrow(/只能取消/);
  });
});
