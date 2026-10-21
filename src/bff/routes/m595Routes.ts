/**
 * 健澜科技 jlmedaios - M595 新标准 P13：住院床位统计 4 GET 端点（只读）
 *
 * GET /api/v1/analytics/inpatient?startDate=&endDate=   按日床位使用率
 * GET /api/v1/analytics/inpatient/by-ward                 按病区汇总（occupancyRate>1 → warning=true）
 * GET /api/v1/analytics/inpatient/los-stats            住院日统计（含超 30 天患者列表）
 * GET /api/v1/analytics/inpatient/transfers               转科统计（含 reasonDistribution）
 *
 * 种子 15 病区：每病区 30-60 编制床位，实际占用 25-70 床；其中 2 病区使用率 >100%。
 * 只读，不写内存 Map；模块加载时生成。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

// ============================== 种子数据（模块加载时生成） ==============================

interface WardRow {
  wardCode: string;
  wardName: string;
  licensedBeds: number;
  occupiedBeds: number;
}

interface LosRow {
  patientId: string;
  wardCode: string;
  losDays: number;
  admitDate: string;
}

interface TransferRow {
  fromWard: string;
  toWard: string;
  reason: string;
}

const WARDS: WardRow[] = [
  { wardCode: 'W01', wardName: '心血管内科一病区', licensedBeds: 45, occupiedBeds: 38 },
  { wardCode: 'W02', wardName: '心血管内科二病区', licensedBeds: 45, occupiedBeds: 52 }, // >100%
  { wardCode: 'W03', wardName: '呼吸内科病区', licensedBeds: 40, occupiedBeds: 35 },
  { wardCode: 'W04', wardName: '消化内科病区', licensedBeds: 40, occupiedBeds: 30 },
  { wardCode: 'W05', wardName: '神经内科病区', licensedBeds: 50, occupiedBeds: 42 },
  { wardCode: 'W06', wardName: '普外科一病区', licensedBeds: 50, occupiedBeds: 48 },
  { wardCode: 'W07', wardName: '普外科二病区', licensedBeds: 50, occupiedBeds: 55 }, // >100%
  { wardCode: 'W08', wardName: '骨科病区', licensedBeds: 45, occupiedBeds: 38 },
  { wardCode: 'W09', wardName: '神经外科病区', licensedBeds: 40, occupiedBeds: 25 },
  { wardCode: 'W10', wardName: '妇产科病区', licensedBeds: 35, occupiedBeds: 28 },
  { wardCode: 'W11', wardName: '儿科病区', licensedBeds: 30, occupiedBeds: 22 },
  { wardCode: 'W12', wardName: '肿瘤科一病区', licensedBeds: 40, occupiedBeds: 33 },
  { wardCode: 'W13', wardName: '肿瘤科二病区', licensedBeds: 40, occupiedBeds: 28 },
  { wardCode: 'W14', wardName: 'ICU', licensedBeds: 20, occupiedBeds: 16 },
  { wardCode: 'W15', wardName: '老年医学科病区', licensedBeds: 35, occupiedBeds: 30 },
];

// 住院日（含超 30 天患者）
const LOS_PATIENTS: LosRow[] = [
  { patientId: 'P-L001', wardCode: 'W02', losDays: 45, admitDate: '2026-09-08' },
  { patientId: 'P-L002', wardCode: 'W07', losDays: 38, admitDate: '2026-09-15' },
  { patientId: 'P-L003', wardCode: 'W05', losDays: 35, admitDate: '2026-09-18' },
  { patientId: 'P-L004', wardCode: 'W12', losDays: 28, admitDate: '2026-09-24' },
  { patientId: 'P-L005', wardCode: 'W01', losDays: 25, admitDate: '2026-09-27' },
  { patientId: 'P-L006', wardCode: 'W08', losDays: 22, admitDate: '2026-09-30' },
  { patientId: 'P-L007', wardCode: 'W03', losDays: 18, admitDate: '2026-10-04' },
  { patientId: 'P-L008', wardCode: 'W06', losDays: 15, admitDate: '2026-10-07' },
];

// 转科记录
const TRANSFERS: TransferRow[] = [
  { fromWard: 'W04', toWard: 'W01', reason: '病情加重' },
  { fromWard: 'W09', toWard: 'W05', reason: '术后转入' },
  { fromWard: 'W03', toWard: 'W14', reason: '呼吸衰竭' },
  { fromWard: 'W11', toWard: 'W05', reason: '脑炎' },
  { fromWard: 'W04', toWard: 'W01', reason: '病情加重' },
  { fromWard: 'W09', toWard: 'W06', reason: '术后转入' },
  { fromWard: 'W03', toWard: 'W14', reason: '呼吸衰竭' },
  { fromWard: 'W10', toWard: 'W11', reason: '新生儿转入' },
];

// 30 天每日床位（用 ward 占用数 × 波动模拟）
function seedDailyOccupancy(): Array<{ date: string; totalBeds: number; occupiedBeds: number }> {
  const rows: Array<{ date: string; totalBeds: number; occupiedBeds: number }> = [];
  const start = new Date('2026-09-22T00:00:00+08:00');
  const totalLicensed = WARDS.reduce((s, w) => s + w.licensedBeds, 0);
  const totalOccupied = WARDS.reduce((s, w) => s + w.occupiedBeds, 0);
  for (let d = 0; d < 30; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const isoDate = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const factor = isWeekend ? 0.92 : 1.0;
    rows.push({
      date: isoDate,
      totalBeds: totalLicensed,
      occupiedBeds: Math.round(totalOccupied * factor * (0.95 + Math.random() * 0.1)),
    });
  }
  return rows;
}

const dailyOccupancy = seedDailyOccupancy();

// ============================== 1. GET /api/v1/analytics/inpatient ==============================

async function handleDaily(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const startDate = (c.query.get('startDate') ?? '').trim();
  const endDate = (c.query.get('endDate') ?? '').trim();

  let rows = dailyOccupancy;
  if (startDate) rows = rows.filter((r) => r.date >= startDate);
  if (endDate) rows = rows.filter((r) => r.date <= endDate);

  const items = rows.map((r) => ({
    date: r.date,
    totalBeds: r.totalBeds,
    occupiedBeds: r.occupiedBeds,
    occupancyRate: Math.round((r.occupiedBeds / r.totalBeds) * 1000) / 1000,
    emptyBeds: r.totalBeds - r.occupiedBeds,
  }));
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 2. GET /api/v1/analytics/inpatient/by-ward ==============================

async function handleByWard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const items = WARDS.map((w) => {
    const rate = w.occupiedBeds / w.licensedBeds;
    return {
      wardCode: w.wardCode,
      wardName: w.wardName,
      licensedBeds: w.licensedBeds,
      occupiedBeds: w.occupiedBeds,
      occupancyRate: Math.round(rate * 1000) / 1000,
      emptyBeds: w.licensedBeds - w.occupiedBeds,
      warning: rate > 1,
    };
  });
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 3. GET /api/v1/analytics/inpatient/los-stats ==============================

async function handleLosStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const avgLOS = Math.round((LOS_PATIENTS.reduce((s, p) => s + p.losDays, 0) / LOS_PATIENTS.length) * 10) / 10;
  const maxLOS = Math.max(...LOS_PATIENTS.map((p) => p.losDays));
  const over30Days = LOS_PATIENTS.filter((p) => p.losDays > 30);

  return json(ok({ avgLOS, maxLOS, over30Days }), 200);
}

// ============================== 4. GET /api/v1/analytics/inpatient/transfers ==============================

async function handleTransfers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const grouped = new Map<string, { fromWard: string; toWard: string; transferCount: number; reasons: Map<string, number> }>();
  for (const t of TRANSFERS) {
    const key = `${t.fromWard}|${t.toWard}`;
    const cur = grouped.get(key) ?? { fromWard: t.fromWard, toWard: t.toWard, transferCount: 0, reasons: new Map() };
    cur.transferCount += 1;
    cur.reasons.set(t.reason, (cur.reasons.get(t.reason) ?? 0) + 1);
    grouped.set(key, cur);
  }

  const items = Array.from(grouped.values()).map((g) => ({
    fromWard: g.fromWard,
    toWard: g.toWard,
    transferCount: g.transferCount,
    reasonDistribution: Object.fromEntries(g.reasons),
  }));
  return json(ok({ items, totalCount: items.length }), 200);
}

export const m595Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/analytics/inpatient', handle: handleDaily, auth: true },
  { method: 'GET', path: '/api/v1/analytics/inpatient/by-ward', handle: handleByWard, auth: true },
  { method: 'GET', path: '/api/v1/analytics/inpatient/los-stats', handle: handleLosStats, auth: true },
  { method: 'GET', path: '/api/v1/analytics/inpatient/transfers', handle: handleTransfers, auth: true },
];
