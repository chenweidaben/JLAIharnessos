/**
 * 健澜科技 jlmedaios - 医院运营实时大屏 API（M480）
 * 对接 BFF /api/v1/operation/* ：
 *   - /operation/daily-visits      今日门急诊
 *   - /operation/inpatient-status 住院实时状态
 *   - /operation/operation-room    手术间实时
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface DailyVisits {
  todayOutpatient: number;
  todayEmergency: number;
  todayRegistration: number;
  trend7d: { date: string; outpatient: number; emergency: number }[];
  demo?: boolean;
}

export interface InpatientStatus {
  inHospital: number;
  todayAdmit: number;
  todayDischarge: number;
  totalBeds: number;
  emptyBeds: number;
  occupancyRate: number; // %
  demo?: boolean;
}

export interface OperationRoom {
  inOperation: number;
  todayCompleted: number;
  waitingNext: number;
  rooms: { id: string; room: string; status: 'idle' | 'in-op' | 'cleaning' | 'waiting'; patient?: string; surgeon?: string; startedAt?: string }[];
  demo?: boolean;
}

const DEMO_VISITS: DailyVisits = {
  todayOutpatient: 3286,
  todayEmergency: 412,
  todayRegistration: 3050,
  trend7d: [
    { date: '10-14', outpatient: 2860, emergency: 380 },
    { date: '10-15', outpatient: 3120, emergency: 402 },
    { date: '10-16', outpatient: 3280, emergency: 425 },
    { date: '10-17', outpatient: 2650, emergency: 390 },
    { date: '10-18', outpatient: 1820, emergency: 310 },
    { date: '10-19', outpatient: 3100, emergency: 405 },
    { date: '10-20', outpatient: 3286, emergency: 412 },
  ],
  demo: true,
};

const DEMO_INPATIENT: InpatientStatus = {
  inHospital: 1864,
  todayAdmit: 62,
  todayDischarge: 48,
  totalBeds: 2200,
  emptyBeds: 336,
  occupancyRate: 84.7,
};

const DEMO_OPROOM: OperationRoom = {
  inOperation: 12,
  todayCompleted: 28,
  waitingNext: 5,
  rooms: [
    { id: 'or-1', room: 'OR-01', status: 'in-op', patient: '张**', surgeon: '王**', startedAt: '08:30' },
    { id: 'or-2', room: 'OR-02', status: 'in-op', patient: '李**', surgeon: '刘**', startedAt: '09:10' },
    { id: 'or-3', room: 'OR-03', status: 'cleaning' },
    { id: 'or-4', room: 'OR-04', status: 'waiting', patient: '赵**', surgeon: '陈**' },
    { id: 'or-5', room: 'OR-05', status: 'idle' },
    { id: 'or-6', room: 'OR-06', status: 'in-op', patient: '孙**', surgeon: '周**', startedAt: '10:00' },
  ],
  demo: true,
};

async function safeGetSingle<T>(url: string, fallback: T): Promise<{ data: T; demo: boolean }> {
  try {
    const res = await get<T & { demo?: boolean }>(url);
    if (res && typeof res === 'object') {
      return { data: res, demo: false };
    }
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchDailyVisits = () =>
  safeGetSingle<DailyVisits>('/operation/daily-visits', DEMO_VISITS);
export const fetchInpatientStatus = () =>
  safeGetSingle<InpatientStatus>('/operation/inpatient-status', DEMO_INPATIENT);
export const fetchOperationRoom = () =>
  safeGetSingle<OperationRoom>('/operation/operation-room', DEMO_OPROOM);
