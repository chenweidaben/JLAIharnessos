/**
 * 健澜科技 jlmedaios - M571 新标准 P7：护理记录单（仅新增 GET /stats 汇总端点）
 *
 * 说明：GET /api/v1/nursing-records、POST /api/v1/nursing-records 已由既有 nursingRecord.ts
 * （DB 后端 + 权限 + listView/createView）注册在线，本路由文件**不重复注册**，
 * 仅补充真正缺失的 stats 汇总端点：
 *
 * GET /api/v1/nursing-records/stats   汇总（totalRecords/byPatient/byShift）
 *
 * 种子 15 条内存护理记录（仅 stats 演示用）：day/evening/night 三班、多患者，含完整出入量。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Shift = 'day' | 'evening' | 'night';

interface Vitals {
  bp: string;
  hr: number;
  temp: number;
  spo2: number;
  respiration: number;
}

interface NrRecord {
  id: string;
  patientId: string;
  wardCode: string;
  shift: Shift;
  recordTime: string;
  vitals: Vitals;
  intake: number;
  output: number;
  nursingNotes: string;
  recordedBy: string;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const nrStore = new Map<string, NrRecord>();
let nrSeq = 0;

function addNr(r: Omit<NrRecord, 'id'>): NrRecord {
  nrSeq += 1;
  const rec: NrRecord = { ...r, id: `NR-${String(nrSeq).padStart(3, '0')}` };
  nrStore.set(rec.id, rec);
  return rec;
}

function seedNr(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  const patients = ['P-N001', 'P-N002', 'P-N003', 'P-N004', 'P-N005'];
  const shifts: Shift[] = ['day', 'evening', 'night'];
  const wards = ['WARD-A', 'WARD-B', 'WARD-C'];

  for (let i = 0; i < 15; i++) {
    const patientId = patients[i % 5];
    const shift = shifts[i % 3];
    const wardCode = wards[i % 3];
    const intake = 800 + (i % 5) * 200;   // 800~1600
    const output = 600 + (i % 4) * 150;     // 600~1050
    addNr({
      patientId,
      wardCode,
      shift,
      recordTime: iso(60 * 24 * (14 - i)),
      vitals: {
        bp: `1${(i % 3) + 0}-/${(i % 2) + 7}${(i % 5) * 4}`,
        hr: 70 + (i % 10),
        temp: 36.5 + (i % 3) * 0.2,
        spo2: 96 + (i % 4),
        respiration: 16 + (i % 4),
      },
      intake,
      output,
      nursingNotes: '生命体征平稳，出入量记录完整',
      recordedBy: `NURSE-${(i % 6) + 1}`,
      createdAt: iso(60 * 24 * (14 - i)),
    });
  }
}
seedNr();

// ============================== GET /api/v1/nursing-records/stats ==============================

async function handleNrStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rows = Array.from(nrStore.values());
  const totalRecords = rows.length;

  // byPatient
  const patientMap = new Map<string, { totalIntake: number; totalOutput: number }>();
  for (const r of rows) {
    const cur = patientMap.get(r.patientId) ?? { totalIntake: 0, totalOutput: 0 };
    cur.totalIntake += r.intake;
    cur.totalOutput += r.output;
    patientMap.set(r.patientId, cur);
  }
  const byPatient = Array.from(patientMap.entries()).map(([patientId, v]) => ({
    patientId,
    totalIntake: v.totalIntake,
    totalOutput: v.totalOutput,
    balance: v.totalIntake - v.totalOutput,
  }));

  // byShift
  const shiftMap = new Map<Shift, { count: number; intakeSum: number; outputSum: number }>();
  for (const r of rows) {
    const cur = shiftMap.get(r.shift) ?? { count: 0, intakeSum: 0, outputSum: 0 };
    cur.count += 1;
    cur.intakeSum += r.intake;
    cur.outputSum += r.output;
    shiftMap.set(r.shift, cur);
  }
  const byShift = Array.from(shiftMap.entries()).map(([shift, v]) => ({
    shift,
    recordCount: v.count,
    avgIntake: v.count > 0 ? Math.round(v.intakeSum / v.count) : 0,
    avgOutput: v.count > 0 ? Math.round(v.outputSum / v.count) : 0,
  }));

  return json(ok({ totalRecords, byPatient, byShift }), 200);
}

export const m571Routes: RouteDef[] = [
  // GET /api/v1/nursing-records、POST /api/v1/nursing-records
  // 已由既有 nursingRecord.ts（DB 后端 + 权限）注册，本文件不重复注册，仅补 /stats
  { method: 'GET', path: '/api/v1/nursing-records/stats', handle: handleNrStats, auth: true },
];
