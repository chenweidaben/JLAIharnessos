/**
 * 健澜科技 jlmedaios - appointmentNo 纯函数单测（M19-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { makeAppointmentId } from '../../src/medical-tools/internet/appointmentNo';

describe('appointmentNo', () => {
  it('前缀+唯一', () => {
    const id = makeAppointmentId(new Date('2026-10-12T10:00:00Z'));
    expect(id).toMatch(/^APT-20261012/);
  });
  it('不同随机不撞', () => {
    const a = makeAppointmentId(new Date(), () => 'aaaaaa');
    const b = makeAppointmentId(new Date(), () => 'bbbbbb');
    expect(a).not.toBe(b);
  });
});
