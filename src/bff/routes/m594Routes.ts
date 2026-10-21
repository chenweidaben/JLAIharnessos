/**
 * 健澜科技 jlmedaios - M594 新标准 P13：门诊量统计 4 GET 端点（只读）
 *
 * GET /api/v1/analytics/outpatient?startDate=&endDate=&deptCode=   按日汇总
 * GET /api/v1/analytics/outpatient/by-dept                          按科室汇总
 * GET /api/v1/analytics/outpatient/by-doctor?deptCode=             按医生汇总
 * GET /api/v1/analytics/outpatient/peak-hours                       高峰时段分布
 *
 * 种子 30 天（2026-09-22 ~ 2026-10-21），8 科室，工作日高/周末低，每日 50-200 人次。
 * 只读，不写内存 Map；模块加载时生成。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

// ============================== 种子数据（模块加载时生成） ==============================

interface DailyRow {
  date: string;
  totalVisits: number;
  avgCost: number;
  appointmentRate: number;
  noShowRate: number;
  deptCode: string;
  doctorId: string;
  slot: '8-11' | '11-14' | '14-17';
  durationMinutes: number;
  satisfaction: number;
}

const DEPTS = ['internal', 'surgery', 'pediatrics', 'obstetrics', 'gynecology', 'orthopedics', 'dermatology', 'ent'];
const SLOTS: Array<'8-11' | '11-14' | '14-17'> = ['8-11', '11-14', '14-17'];

function seedDaily(): DailyRow[] {
  const rows: DailyRow[] = [];
  const start = new Date('2026-09-22T00:00:00+08:00');
  for (let d = 0; d < 30; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const isoDate = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const base = isWeekend ? 60 : 150;

    for (const dept of DEPTS) {
      for (const slot of SLOTS) {
        const visits = Math.round(base * (0.8 + Math.random() * 0.4));
        rows.push({
          date: isoDate,
          totalVisits: visits,
          avgCost: Math.round(100 + Math.random() * 400),
          appointmentRate: Math.round((0.5 + Math.random() * 0.4) * 100) / 100,
          noShowRate: Math.round((0.05 + Math.random() * 0.1) * 100) / 100,
          deptCode: dept,
          doctorId: `DOC-${dept.toUpperCase()}-${(d % 3) + 1}`,
          slot,
          durationMinutes: Math.round(8 + Math.random() * 12),
          satisfaction: Math.round(3 + Math.random() * 2),
        });
      }
    }
  }
  return rows;
}

const daily = seedDaily();

// ============================== 1. GET /api/v1/analytics/outpatient ==============================

async function handleDaily(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const startDate = (c.query.get('startDate') ?? '').trim();
  const endDate = (c.query.get('endDate') ?? '').trim();
  const deptCode = (c.query.get('deptCode') ?? '').trim();

  let rows = daily;
  if (deptCode) rows = rows.filter((r) => r.deptCode === deptCode);
  if (startDate) rows = rows.filter((r) => r.date >= startDate);
  if (endDate) rows = rows.filter((r) => r.date <= endDate);

  // 按日汇总
  const byDate = new Map<string, { totalVisits: number; costSum: number; apptSum: number; noShowSum: number; count: number }>();
  for (const r of rows) {
    const cur = byDate.get(r.date) ?? { totalVisits: 0, costSum: 0, apptSum: 0, noShowSum: 0, count: 0 };
    cur.totalVisits += r.totalVisits;
    cur.costSum += r.avgCost;
    cur.apptSum += r.appointmentRate;
    cur.noShowSum += r.noShowRate;
    cur.count += 1;
    byDate.set(r.date, cur);
  }
  const items = Array.from(byDate.entries())
    .map(([date, v]) => ({
      date,
      totalVisits: v.totalVisits,
      avgCost: Math.round(v.costSum / v.count),
      appointmentRate: Math.round((v.apptSum / v.count) * 100) / 100,
      noShowRate: Math.round((v.noShowSum / v.count) * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 2. GET /api/v1/analytics/outpatient/by-dept ==============================

async function handleByDept(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const byDept = new Map<string, { totalVisits: number; costSum: number; apptSum: number; noShowSum: number; count: number }>();
  for (const r of daily) {
    const cur = byDept.get(r.deptCode) ?? { totalVisits: 0, costSum: 0, apptSum: 0, noShowSum: 0, count: 0 };
    cur.totalVisits += r.totalVisits;
    cur.costSum += r.avgCost;
    cur.apptSum += r.appointmentRate;
    cur.noShowSum += r.noShowRate;
    cur.count += 1;
    byDept.set(r.deptCode, cur);
  }
  const items = Array.from(byDept.entries()).map(([deptCode, v]) => ({
    deptCode,
    totalVisits: v.totalVisits,
    avgCostPerVisit: Math.round(v.costSum / v.count),
    appointmentRate: Math.round((v.apptSum / v.count) * 100) / 100,
    noShowRate: Math.round((v.noShowSum / v.count) * 100) / 100,
  }));
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 3. GET /api/v1/analytics/outpatient/by-doctor ==============================

async function handleByDoctor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();

  let rows = daily;
  if (deptCode) rows = rows.filter((r) => r.deptCode === deptCode);

  const byDoc = new Map<string, { deptCode: string; totalVisits: number; durSum: number; satSum: number; count: number }>();
  for (const r of rows) {
    const key = `${r.deptCode}|${r.doctorId}`;
    const cur = byDoc.get(key) ?? { deptCode: r.deptCode, totalVisits: 0, durSum: 0, satSum: 0, count: 0 };
    cur.totalVisits += r.totalVisits;
    cur.durSum += r.durationMinutes;
    cur.satSum += r.satisfaction;
    cur.count += 1;
    byDoc.set(key, cur);
  }
  const items = Array.from(byDoc.entries()).map(([key, v]) => {
    const [, doctorId] = key.split('|');
    return {
      doctorId,
      deptCode: v.deptCode,
      totalVisits: v.totalVisits,
      avgDurationMinutes: Math.round(v.durSum / v.count),
      avgSatisfaction: Math.round((v.satSum / v.count) * 10) / 10,
    };
  });
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 4. GET /api/v1/analytics/outpatient/peak-hours ==============================

async function handlePeak(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const bySlot = new Map<string, number>();
  let total = 0;
  for (const r of daily) {
    bySlot.set(r.slot, (bySlot.get(r.slot) ?? 0) + r.totalVisits);
    total += r.totalVisits;
  }
  const items = SLOTS.map((slot) => {
    const visits = bySlot.get(slot) ?? 0;
    return { slot, visits, percentage: total > 0 ? Math.round((visits / total) * 100) : 0 };
  });
  return json(ok({ items, totalCount: items.length }), 200);
}

export const m594Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/analytics/outpatient', handle: handleDaily, auth: true },
  { method: 'GET', path: '/api/v1/analytics/outpatient/by-dept', handle: handleByDept, auth: true },
  { method: 'GET', path: '/api/v1/analytics/outpatient/by-doctor', handle: handleByDoctor, auth: true },
  { method: 'GET', path: '/api/v1/analytics/outpatient/peak-hours', handle: handlePeak, auth: true },
];
