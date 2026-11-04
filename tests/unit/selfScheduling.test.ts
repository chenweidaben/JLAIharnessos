/**
 * 健澜AI原生医院操作系统OS - P3-3 号源池+患者自助预约 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore, SlotError,
  listSlots, seedSlots, createBooking, listBookings, cancelBooking, listDepartments, TIME_SLOTS,
} from '../../src/bff/aggregators/selfSchedulingAggregator';

beforeEach(() => { __resetStore(); });

function seedOne(capacity = 2) {
  return seedSlots([{
    departmentId: 'cardiology', doctorId: 'D1', date: '2026-11-10',
    timeSlot: '08:00-08:30', slotType: 'outpatient', capacity,
  }])[0];
}

describe('P3-3 号源池', () => {
  test('TIME_SLOTS 10 个时段', () => {
    expect(TIME_SLOTS.length).toBe(10);
  });
  test('seedSlots + listSlots 过滤', () => {
    seedOne();
    expect(listSlots({}).length).toBe(1);
    expect(listSlots({ departmentId: 'cardiology' }).length).toBe(1);
    expect(listSlots({ date: '2026-11-10' }).length).toBe(1);
    expect(listSlots({ departmentId: 'NOPE' }).length).toBe(0);
  });
  test('timeSlot 非法 → 400', () => {
    expect(() => seedSlots([{ departmentId: 'x', date: '2026-11-10', timeSlot: '25:00-25:30' as any, slotType: 'outpatient', capacity: 1 }])).toThrow(/timeSlot/);
  });
  test('slotType 非法 → 400', () => {
    expect(() => seedSlots([{ departmentId: 'x', date: '2026-11-10', timeSlot: '08:00-08:30', slotType: 'walkin' as any, capacity: 1 }])).toThrow(/slotType/);
  });
  test('listDepartments 非空', () => {
    expect(listDepartments().length).toBeGreaterThan(0);
  });
});

describe('P3-3 预约/取消', () => {
  test('预约成功 slot.booked++', () => {
    const s = seedOne();
    const b = createBooking('P1', s.slotId);
    expect(b.status).toBe('booked');
    expect(listSlots({})[0].booked).toBe(1);
  });
  test('号源满 → 409', () => {
    const s = seedOne(1);
    createBooking('P1', s.slotId);
    expect(() => createBooking('P2', s.slotId)).toThrow(/号源已/);
  });
  test('满号自动 closed；取消后 re-open', () => {
    const s = seedOne(1);
    const b = createBooking('P1', s.slotId);
    expect(listSlots({})[0].status).toBe('closed');
    cancelBooking('P1', b.bookingId);
    expect(listSlots({})[0].status).toBe('open');
    expect(listSlots({})[0].booked).toBe(0);
  });
  test('重复预约同 slot → 409', () => {
    const s = seedOne(3);
    createBooking('P1', s.slotId);
    expect(() => createBooking('P1', s.slotId)).toThrow(/重复预约/);
  });
  test('slot 不存在 → 404', () => {
    expect(() => createBooking('P1', 'NOPE')).toThrow(SlotError);
    try { createBooking('P1', 'NOPE'); } catch (e) { expect((e as SlotError).status).toBe(404); }
  });
  test('取消释放 booked--；重复取消 → 409', () => {
    const s = seedOne();
    const b = createBooking('P1', s.slotId);
    cancelBooking('P1', b.bookingId);
    expect(listSlots({})[0].booked).toBe(0);
    expect(() => cancelBooking('P1', b.bookingId)).toThrow(/重复取消/);
  });
  test('取消别人预约 → 403', () => {
    const s = seedOne();
    const b = createBooking('P1', s.slotId);
    expect(() => cancelBooking('P2', b.bookingId)).toThrow(/只能取消/);
  });
  test('bookings 列表按 patientId 过滤', () => {
    const s = seedOne();
    createBooking('P1', s.slotId);
    expect(listBookings('P1').length).toBe(1);
    expect(listBookings('P2').length).toBe(0);
  });
  test('checkup 类型 slot 带 examType', () => {
    const s = seedSlots([{
      departmentId: 'checkup-center', date: '2026-11-10', timeSlot: '09:00-09:30',
      slotType: 'checkup', examType: 'CT', capacity: 5,
    }])[0];
    expect(s.examType).toBe('CT');
  });
});
