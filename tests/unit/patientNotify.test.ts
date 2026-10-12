/**
 * 健澜科技 jlmedaios - 通知纯函数单测（M20-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildNotif, unreadOnly } from '../../src/medical-tools/internet/patientNotify';

describe('patientNotify pure', () => {
  it('report_pushed 文案', () => {
    const n = buildNotif('report_pushed', { reportType: 'lab' });
    expect(n.title).toContain('新报告');
  });
  it('appointment_booked 文案', () => {
    const n = buildNotif('appointment_booked', { appointmentNo: 'APT-1' });
    expect(n.body).toContain('APT-1');
  });
  it('未读过滤', () => {
    const rows = [{ readAt: null }, { readAt: '2026-01-01' }];
    expect(unreadOnly(rows)).toHaveLength(1);
  });
});
