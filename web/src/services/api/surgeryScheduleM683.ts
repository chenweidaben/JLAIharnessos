/**
 * 健澜科技 jlmedaios - 手术排程管理 API（M683）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ScheduleStatus = 'queued' | 'in_operating' | 'completed' | 'delayed' | 'cancelled';

export interface SurgerySchedule {
  id: string;
  date: string;
  orRoom: string;
  timeSlot: string;
  patientId: string;
  surgeryName: string;
  surgeon: string;
  anesthesiaType: string;
  incisionClass: string;
  status: ScheduleStatus;
}

export const SCHEDULE_STATUS_META: Record<ScheduleStatus, { label: string; color: string }> = {
  queued: { label: '待手术', color: 'blue' },
  in_operating: { label: '手术中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
  delayed: { label: '延迟', color: 'orange' },
  cancelled: { label: '已取消', color: 'default' },
};

const DEMO: SurgerySchedule[] = [
  { id: 'SS-001', date: '2026-10-22', orRoom: '1 号手术间', timeSlot: '09:00-10:30', patientId: 'P10002', surgeryName: '腹腔镜胆囊切除术', surgeon: '刘主任', anesthesiaType: '全麻', incisionClass: 'I 类', status: 'completed' },
  { id: 'SS-002', date: '2026-10-22', orRoom: '1 号手术间', timeSlot: '10:30-12:00', patientId: 'P10005', surgeryName: '冠脉支架植入', surgeon: '陈主任', anesthesiaType: '局麻', incisionClass: 'II 类', status: 'in_operating' },
  { id: 'SS-003', date: '2026-10-22', orRoom: '2 号手术间', timeSlot: '09:00-11:00', patientId: 'P10008', surgeryName: '甲状腺次全切除', surgeon: '王主任', anesthesiaType: '颈丛麻醉', incisionClass: 'I 类', status: 'queued' },
  { id: 'SS-004', date: '2026-10-22', orRoom: '3 号手术间', timeSlot: '13:30-16:00', patientId: 'P10012', surgeryName: '胃癌根治术', surgeon: '赵主任', anesthesiaType: '全麻', incisionClass: 'II 类', status: 'delayed' },
];

export interface ScheduleListResult {
  items: SurgerySchedule[];
  demo: boolean;
}

export async function fetchSurgerySchedule(): Promise<ScheduleListResult> {
  try {
    const res = await get<{ items: SurgerySchedule[] }>('/surgery/schedule');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
