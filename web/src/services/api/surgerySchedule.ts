/**
 * 健澜科技 jlmedaios - 手术排程看板 API
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface PlacedItem {
  id: string;
  requestNo: string;
  patientLabel: string;
  procedure: string;
  department: string;
  surgeonLabel: string;
  status: string;
  room: string;
  date: string;
  startMinute: number;
  durationMin: number;
  endMinute: number;
  startLabel: string;
  endLabel: string;
  demo?: boolean;
}

export interface TimeSlot {
  minute: number;
  label: string;
}

export interface DayView {
  date: string;
  rooms: string[];
  timeSlots: TimeSlot[];
  items: PlacedItem[];
  demo: boolean;
}

export interface WeekDay {
  date: string;
  weekday: string;
  items: PlacedItem[];
}

export interface WeekView {
  weekStart: string;
  rooms: string[];
  days: WeekDay[];
  demo: boolean;
}

export interface ScheduleBoard {
  date: string;
  weekStart: string;
  day: DayView;
  week: WeekView;
  demo: boolean;
}

export async function getSurgerySchedule(date: string): Promise<ScheduleBoard> {
  return get<ScheduleBoard>(`/surgery/schedule`, { date });
}
