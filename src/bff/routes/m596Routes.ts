/**
 * 健澜科技 jlmedaios - M596 新标准 P13：手术量统计 4 GET 端点（只读）
 *
 * GET /api/v1/analytics/surgery?startDate=&endDate=   按日手术量
 * GET /api/v1/analytics/surgery/by-room                按手术间汇总
 * GET /api/v1/analytics/surgery/by-level               按手术分级
 * GET /api/v1/analytics/surgery/elective-vs-emergency   择期 vs 急诊（含 waitOver7Days 预警）
 *
 * 种子 60 天（2026-08-23 ~ 2026-10-21），10 手术间 OR01~OR10，一/二/三/四级混合，择期/急诊混合。
 * 只读，不写内存 Map；模块加载时生成。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

// ============================== 种子数据（模块加载时生成） ==============================

interface CaseRow {
  date: string;
  roomCode: string;
  level: '1' | '2' | '3' | '4';
  type: 'elective' | 'emergency';
  durationMinutes: number;
  waitDays: number;
  caseId: string;
  patientId: string;
}

const ROOMS = Array.from({ length: 10 }, (_, i) => `OR${String(i + 1).padStart(2, '0')}`);
const LEVELS: Array<'1' | '2' | '3' | '4'> = ['1', '2', '3', '4'];

function seedCases(): CaseRow[] {
  const rows: CaseRow[] = [];
  const start = new Date('2026-08-23T00:00:00+08:00');
  let seq = 0;
  for (let d = 0; d < 60; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const isoDate = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const casesPerDay = isWeekend ? 3 : 10;
    for (let c = 0; c < casesPerDay; c++) {
      seq += 1;
      const isEmergency = Math.random() < 0.15;
      const waitDays = isEmergency ? 0 : Math.round(Math.random() * 14);
      rows.push({
        date: isoDate,
        roomCode: ROOMS[seq % 10],
        level: LEVELS[seq % 4],
        type: isEmergency ? 'emergency' : 'elective',
        durationMinutes: Math.round(60 + Math.random() * 180),
        waitDays,
        caseId: `CASE-${String(seq).padStart(4, '0')}`,
        patientId: `P-S${String(seq).padStart(4, '0')}`,
      });
    }
  }
  return rows;
}

const cases = seedCases();

// ============================== 1. GET /api/v1/analytics/surgery ==============================

async function handleDaily(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const startDate = (c.query.get('startDate') ?? '').trim();
  const endDate = (c.query.get('endDate') ?? '').trim();

  let rows = cases;
  if (startDate) rows = rows.filter((r) => r.date >= startDate);
  if (endDate) rows = rows.filter((r) => r.date <= endDate);

  const byDate = new Map<string, { total: number; elective: number; emergency: number; durSum: number; count: number }>();
  for (const r of rows) {
    const cur = byDate.get(r.date) ?? { total: 0, elective: 0, emergency: 0, durSum: 0, count: 0 };
    cur.total += 1;
    if (r.type === 'elective') cur.elective += 1;
    else cur.emergency += 1;
    cur.durSum += r.durationMinutes;
    cur.count += 1;
    byDate.set(r.date, cur);
  }
  const items = Array.from(byDate.entries())
    .map(([date, v]) => ({
      date,
      totalCases: v.total,
      electiveCases: v.elective,
      emergencyCases: v.emergency,
      avgDurationMinutes: Math.round(v.durSum / v.count),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 2. GET /api/v1/analytics/surgery/by-room ==============================

async function handleByRoom(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const byRoom = new Map<string, { total: number; durSum: number; count: number }>();
  for (const r of cases) {
    const cur = byRoom.get(r.roomCode) ?? { total: 0, durSum: 0, count: 0 };
    cur.total += 1;
    cur.durSum += r.durationMinutes;
    cur.count += 1;
    byRoom.set(r.roomCode, cur);
  }
  const items = Array.from(byRoom.entries()).map(([roomCode, v]) => ({
    roomCode,
    totalCases: v.total,
    avgDurationMinutes: Math.round(v.durSum / v.count),
    utilizationRate: Math.round((v.total / 60) * 100) / 100,
  }));
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 3. GET /api/v1/analytics/surgery/by-level ==============================

async function handleByLevel(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const total = cases.length;
  const byLevel = new Map<string, number>();
  for (const r of cases) {
    byLevel.set(r.level, (byLevel.get(r.level) ?? 0) + 1);
  }
  const items = LEVELS.map((level) => {
    const count = byLevel.get(level) ?? 0;
    return {
      level,
      totalCases: count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 4. GET /api/v1/analytics/surgery/elective-vs-emergency ==============================

async function handleElectiveVsEmergency(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const elective = cases.filter((c) => c.type === 'elective');
  const emergency = cases.filter((c) => c.type === 'emergency');
  const total = cases.length;
  const waitOver7Days = elective.filter((c) => c.waitDays > 7).map((c) => ({
    caseId: c.caseId,
    patientId: c.patientId,
    roomCode: c.roomCode,
    waitDays: c.waitDays,
  }));
  const avgWaitDaysElective = elective.length > 0
    ? Math.round((elective.reduce((s, c) => s + c.waitDays, 0) / elective.length) * 10) / 10
    : 0;

  return json(ok({
    electiveTotal: elective.length,
    emergencyTotal: emergency.length,
    electivePercentage: total > 0 ? Math.round((elective.length / total) * 100) : 0,
    emergencyPercentage: total > 0 ? Math.round((emergency.length / total) * 100) : 0,
    avgWaitDaysElective,
    waitOver7Days,
  }), 200);
}

export const m596Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/analytics/surgery', handle: handleDaily, auth: true },
  { method: 'GET', path: '/api/v1/analytics/surgery/by-room', handle: handleByRoom, auth: true },
  { method: 'GET', path: '/api/v1/analytics/surgery/by-level', handle: handleByLevel, auth: true },
  { method: 'GET', path: '/api/v1/analytics/surgery/elective-vs-emergency', handle: handleElectiveVsEmergency, auth: true },
];
