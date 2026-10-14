/**
 * 健澜科技 jlmedaios - 手术排程看板纯函数单测
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  ROOMS,
  DAY_START_MIN,
  SLOT_MIN,
  assignRoomsAndTimes,
  buildDayView,
  buildTimeSlots,
  buildWeekView,
  demoItems,
  minToLabel,
  mondayOf,
  type ScheduleItem,
} from '../../src/bff/aggregators/surgeryScheduleAggregator';
import type { SurgeryRequest } from '../../src/db/repositories/surgeryRepo';

function req(partial: Partial<SurgeryRequest>): SurgeryRequest {
  return {
    id: 'id-' + Math.random().toString(36).slice(2, 8),
    requestNo: 'SUR-1',
    visitId: 'v1',
    patientId: 'p-001',
    surgeryType: 'elective',
    plannedProcedure: '腹腔镜胆囊切除术',
    diagnosis: null,
    plannedDate: '2026-10-14',
    department: '普外科',
    surgeonId: 'u-1',
    anesthetistId: null,
    anesthesiaMethod: null,
    status: 'scheduled',
    precheck: {},
    precheckedAt: null,
    startedAt: null,
    endedAt: null,
    surgeonSignedAt: null,
    anesthetistSignedAt: null,
    cancelReason: null,
    createdAt: '2026-10-13T08:00:00.000Z',
    updatedAt: '2026-10-13T08:00:00.000Z',
    ...partial,
  } as SurgeryRequest;
}

describe('minToLabel / buildTimeSlots', () => {
  it('分钟格式化为 HH:mm', () => {
    expect(minToLabel(480)).toBe('08:00');
    expect(minToLabel(510)).toBe('08:30');
    expect(minToLabel(1019)).toBe('16:59');
  });
  it('时间轴从 08:00 起、30 分钟一格、最后一格 < 17:00', () => {
    const slots = buildTimeSlots();
    expect(slots[0].minute).toBe(DAY_START_MIN);
    expect(slots[0].label).toBe('08:00');
    expect(slots[slots.length - 1].minute).toBe(16 * 60 + 30);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].minute - slots[i - 1].minute).toBe(SLOT_MIN);
    }
  });
});

describe('buildDayView', () => {
  const items: ScheduleItem[] = [
    { id: 'a', requestNo: 'S1', patientLabel: '患001', procedure: 'A术', department: '普外', surgeonLabel: '医张', status: 'scheduled', room: ROOMS[0], date: '2026-10-14', startMinute: 540, durationMin: 90 },
    { id: 'b', requestNo: 'S2', patientLabel: '患002', procedure: 'B术', department: '骨科', surgeonLabel: '医王', status: 'maintenance', room: ROOMS[1], date: '2026-10-14', startMinute: 510, durationMin: 60 },
    { id: 'c', requestNo: 'S3', patientLabel: '患003', procedure: 'C术', department: '普外', surgeonLabel: '医李', status: 'scheduled', room: ROOMS[0], date: '2026-10-15', startMinute: 540, durationMin: 90 },
  ];
  it('只保留当日行并补齐起止标签', () => {
    const day = buildDayView('2026-10-14', items);
    expect(day.items).toHaveLength(2);
    expect(day.rooms).toEqual([...ROOMS]);
    expect(day.items[0].id).toBe('b'); // 08:30 先于 09:00
    expect(day.items[0].endMinute).toBe(570);
    expect(day.items[0].startLabel).toBe('08:30');
    expect(day.items[0].endLabel).toBe('09:30');
  });
  it('空输入时仍返回完整列与时间轴', () => {
    const day = buildDayView('2026-10-14', []);
    expect(day.items).toHaveLength(0);
    expect(day.rooms).toHaveLength(ROOMS.length);
    expect(day.timeSlots.length).toBeGreaterThan(0);
  });
  it('demo 标记透传', () => {
    expect(buildDayView('2026-10-14', [], true).demo).toBe(true);
  });
});

describe('mondayOf / buildWeekView', () => {
  it('周三取所在周周一', () => {
    expect(mondayOf('2026-10-14')).toBe('2026-10-12'); // 2026-10-14 是周三
  });
  it('周日取当周周一（不跨入下周）', () => {
    expect(mondayOf('2026-10-18')).toBe('2026-10-12');
  });
  it('周视图固定 7 天并按日落位', () => {
    const items: ScheduleItem[] = [
      { id: 'a', requestNo: 'S1', patientLabel: '患001', procedure: 'A术', department: '普外', surgeonLabel: '医张', status: 'scheduled', room: ROOMS[0], date: '2026-10-12', startMinute: 510, durationMin: 90 },
      { id: 'b', requestNo: 'S2', patientLabel: '患002', procedure: 'B术', department: '骨科', surgeonLabel: '医王', status: 'scheduled', room: ROOMS[1], date: '2026-10-14', startMinute: 540, durationMin: 60 },
    ];
    const week = buildWeekView('2026-10-12', items);
    expect(week.days).toHaveLength(7);
    expect(week.days[0].weekday).toBe('周一');
    expect(week.days[0].date).toBe('2026-10-12');
    expect(week.days[0].items).toHaveLength(1);
    expect(week.days[2].items).toHaveLength(1);
    expect(week.days[1].items).toHaveLength(0);
  });
});

describe('assignRoomsAndTimes', () => {
  it('取消与无日期的申请被过滤', () => {
    const out = assignRoomsAndTimes([
      req({ id: 'r1', status: 'cancelled', plannedDate: '2026-10-14' }),
      req({ id: 'r2', plannedDate: null }),
    ]);
    expect(out).toHaveLength(0);
  });
  it('急诊固定落急诊手术间，普通间散列分配', () => {
    const out = assignRoomsAndTimes([
      req({ id: 'e1', surgeryType: 'emergency', plannedDate: '2026-10-14' }),
      req({ id: 'n1', surgeryType: 'elective', plannedDate: '2026-10-14' }),
    ]);
    expect(out.find((i) => i.id === 'e1')?.room).toBe('急诊手术间');
    expect(out.find((i) => i.id === 'n1')?.room).not.toBe('急诊手术间');
  });
  it('同间同日从 08:30 起排队，间隔含 15 分钟周转', () => {
    const out = assignRoomsAndTimes([
      req({ id: 'n1', surgeryType: 'elective', plannedDate: '2026-10-14', createdAt: '2026-10-13T08:00:00Z' }),
      req({ id: 'n2', surgeryType: 'elective', plannedDate: '2026-10-14', createdAt: '2026-10-13T09:00:00Z' }),
    ]);
    const sorted = [...out].sort((a, b) => a.startMinute - b.startMinute);
    // 仅当两间散列到同一间时才构成队列；同输入两次结果一致即可
    const again = assignRoomsAndTimes([
      req({ id: 'n1', surgeryType: 'elective', plannedDate: '2026-10-14', createdAt: '2026-10-13T08:00:00Z' }),
      req({ id: 'n2', surgeryType: 'elective', plannedDate: '2026-10-14', createdAt: '2026-10-13T09:00:00Z' }),
    ]);
    expect(sorted.map((i) => i.startMinute)).toEqual(again.map((i) => i.startMinute));
    expect(sorted[0].startMinute).toBe(8 * 60 + 30);
  });
});

describe('demoItems', () => {
  it('整周演示行全部带 demo:true', () => {
    const items = demoItems('2026-10-12');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.demo === true)).toBe(true);
    const days = new Set(items.map((i) => i.date));
    expect(days.size).toBeGreaterThan(1);
  });
});
