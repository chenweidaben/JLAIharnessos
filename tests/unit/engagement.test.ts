/**
 * 健澜AI原生医院操作系统OS - P3-4 报告推送+满意度闭环工单 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore, EngagementError,
  publishReport, listReports, markReportRead,
  createTicket, listTickets, addComment, updateTicketStatus, autoCreateLowSatisfactionTicket,
} from '../../src/bff/aggregators/engagementAggregator';

beforeEach(() => { __resetStore(); });

describe('P3-4 报告', () => {
  test('发布普通报告 → status=pushed, channels=[in-app]', () => {
    const r = publishReport({ patientId: 'P1', visitId: 'V1', type: 'lab', title: '血常规', result: 'WBC 6.5', isAbnormal: false });
    expect(r.status).toBe('pushed');
    expect(r.pushChannels).toEqual(['in-app']);
    expect(r.pushedAt).toBeTruthy();
  });
  test('isAbnormal=true → channels=[in-app, sms]', () => {
    const r = publishReport({ patientId: 'P1', visitId: 'V1', type: 'lab', title: '血钾', result: 'K 2.5', isAbnormal: true });
    expect(r.pushChannels).toEqual(['in-app', 'sms']);
  });
  test('read 幂等', () => {
    const r = publishReport({ patientId: 'P1', visitId: 'V1', type: 'lab', title: 'x', result: '', isAbnormal: false });
    const r1 = markReportRead('P1', r.reportId);
    expect(r1.status).toBe('read');
    const r2 = markReportRead('P1', r.reportId);
    expect(r2.readAt).toBe(r1.readAt);
  });
  test('listReports 按 patientId 过滤 + 倒序', () => {
    publishReport({ patientId: 'P1', visitId: 'V1', type: 'lab', title: 'a', result: '', isAbnormal: false });
    publishReport({ patientId: 'P2', visitId: 'V2', type: 'lab', title: 'b', result: '', isAbnormal: false });
    expect(listReports('P1').length).toBe(1);
    expect(listReports('NOBODY').length).toBe(0);
  });
  test('type 非法 → 400', () => {
    expect(() => publishReport({ patientId: 'P1', visitId: 'V1', type: 'xray' as any, title: 'x', result: '', isAbnormal: false })).toThrow(/type/);
  });
  test('read 别人报告 → 403', () => {
    const r = publishReport({ patientId: 'P1', visitId: 'V1', type: 'lab', title: 'x', result: '', isAbnormal: false });
    try { markReportRead('P2', r.reportId); expect(true).toBe(false); } catch (e) { expect((e as EngagementError).status).toBe(403); }
  });
});

describe('P3-4 工单', () => {
  test('患者建工单 → status=open', () => {
    const t = createTicket({ patientId: 'P1', subject: '等待太久', description: '候诊 2 小时' });
    expect(t.status).toBe('open');
    expect(t.source).toBe('complaint');
  });
  test('subject 必填 + ≤200', () => {
    expect(() => createTicket({ patientId: 'P1', subject: '', description: '' })).toThrow(/subject/);
    expect(() => createTicket({ patientId: 'P1', subject: 'x'.repeat(201), description: '' })).toThrow(/200/);
  });
  test('source 枚举', () => {
    expect(() => createTicket({ patientId: 'P1', subject: 'x', description: '', source: 'spam' as any })).toThrow(/source/);
  });
  test('autoCreateLowSatisfactionTicket source=low-satisfaction', () => {
    const t = autoCreateLowSatisfactionTicket('P1', 'SV-001', 'score=2 等待久');
    expect(t.source).toBe('low-satisfaction');
    expect(t.relatedSurveyId).toBe('SV-001');
  });
  test('状态机 open→investigating→resolved→closed', () => {
    const t = createTicket({ patientId: 'P1', subject: 'x', description: '' });
    expect(updateTicketStatus(t.ticketId, 'investigating').status).toBe('investigating');
    expect(updateTicketStatus(t.ticketId, 'resolved').status).toBe('resolved');
    const c = updateTicketStatus(t.ticketId, 'closed', '已联系患者处理');
    expect(c.status).toBe('closed');
    expect(c.resolvedAt).toBeTruthy();
  });
  test('非法跃迁 open→closed → 409', () => {
    const t = createTicket({ patientId: 'P1', subject: 'x', description: '' });
    expect(() => updateTicketStatus(t.ticketId, 'closed')).toThrow(/非法状态跃迁/);
  });
  test('关单必须填 comment', () => {
    const t = createTicket({ patientId: 'P1', subject: 'x', description: '' });
    updateTicketStatus(t.ticketId, 'investigating');
    updateTicketStatus(t.ticketId, 'resolved');
    expect(() => updateTicketStatus(t.ticketId, 'closed')).toThrow(/comment/);
  });
  test('closed 工单 comment → 409', () => {
    const t = createTicket({ patientId: 'P1', subject: 'x', description: '' });
    updateTicketStatus(t.ticketId, 'investigating');
    updateTicketStatus(t.ticketId, 'resolved');
    updateTicketStatus(t.ticketId, 'closed', 'ok');
    expect(() => addComment(t.ticketId, 'P1', 'patient', '追评')).toThrow(/closed/);
  });
  test('comment 追加', () => {
    const t = createTicket({ patientId: 'P1', subject: 'x', description: '' });
    const t2 = addComment(t.ticketId, 'P1', 'patient', '补充说明');
    expect(t2.comments.length).toBe(1);
  });
  test('listTickets 按 patientId', () => {
    createTicket({ patientId: 'P1', subject: 'a', description: '' });
    createTicket({ patientId: 'P2', subject: 'b', description: '' });
    expect(listTickets('P1').length).toBe(1);
  });
});
