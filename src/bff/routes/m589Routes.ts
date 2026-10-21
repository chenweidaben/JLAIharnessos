/**
 * 健澜科技 jlmedaios - M589 新标准 P11：患者满意度（补缺失端点）
 *
 * 去重说明：GET /api/v1/satisfaction-surveys（列表）、POST /api/v1/satisfaction-surveys（提交）、
 * GET /api/v1/satisfaction-surveys/ranking（排名）已由既有 satisfactionSurvey.ts（DB 后端）注册在线。
 *
 * 本文件只补缺失端点：
 *   GET /api/v1/satisfaction-surveys/stats  —— 汇总（totalSurveys + averageOverall + byDept + byDoctor）
 *
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

interface Dimension {
  attitude: number;
  professionalism: number;
  waiting_time: number;
  environment: number;
  followup: number;
}

interface SsRecord {
  id: string;
  patientId: string;
  visitId: string;
  deptCode: string;
  doctorId: string;
  overallScore: number;
  dimensions: Dimension;
  comment: string;
  submittedAt: string;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const ssStore = new Map<string, SsRecord>();
let ssSeq = 0;

function addSs(r: Omit<SsRecord, 'id'>): SsRecord {
  ssSeq += 1;
  const rec: SsRecord = { ...r, id: `SS-${String(ssSeq).padStart(3, '0')}` };
  ssStore.set(rec.id, rec);
  return rec;
}

function seedSs(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const depts = ['internal', 'surgery', 'cardiology', 'neurology', 'pediatrics'];

  for (let i = 1; i <= 50; i++) {
    const dept = depts[i % 5];
    const doctor = `DOC-${dept.toUpperCase()}-${(i % 3) + 1}`;
    addSs({
      patientId: `P-S${String(i).padStart(3, '0')}`,
      visitId: `V-S${String(i).padStart(3, '0')}`,
      deptCode: dept,
      doctorId: doctor,
      overallScore: ((i * 7) % 5) + 1,
      dimensions: {
        attitude: ((i * 3) % 5) + 1,
        professionalism: ((i * 5) % 5) + 1,
        waiting_time: ((i * 2) % 5) + 1,
        environment: ((i * 4) % 5) + 1,
        followup: ((i * 6) % 5) + 1,
      },
      comment: `评价${i}`,
      submittedAt: iso(60 * 24 * (30 - i)),
      createdAt: iso(60 * 24 * (30 - i)),
    });
  }
}
seedSs();

// ============================== GET /api/v1/satisfaction-surveys/stats ==============================

async function handleSsStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rows = Array.from(ssStore.values());
  const total = rows.length;
  const avgOverall = total > 0
    ? Math.round((rows.reduce((s, r) => s + r.overallScore, 0) / total) * 10) / 10
    : 0;

  // byDept
  const deptMap = new Map<string, { total: number; sum: number; rated: number }>();
  for (const r of rows) {
    const cur = deptMap.get(r.deptCode) ?? { total: 0, sum: 0, rated: 0 };
    cur.total += 1;
    cur.sum += r.overallScore;
    if (r.comment) cur.rated += 1;
    deptMap.set(r.deptCode, cur);
  }
  const byDept = Array.from(deptMap.entries()).map(([deptCode, v]) => ({
    deptCode,
    total: v.total,
    avgOverall: v.total > 0 ? Math.round((v.sum / v.total) * 10) / 10 : 0,
    responseRate: v.total > 0 ? Math.round((v.rated / v.total) * 100) : 0,
  }));

  // byDoctor
  const docMap = new Map<string, { total: number; sum: number; promoters: number }>();
  for (const r of rows) {
    const cur = docMap.get(r.doctorId) ?? { total: 0, sum: 0, promoters: 0 };
    cur.total += 1;
    cur.sum += r.overallScore;
    if (r.overallScore >= 9) cur.promoters += 1;
    docMap.set(r.doctorId, cur);
  }
  const byDoctor = Array.from(docMap.entries()).map(([doctorId, v]) => ({
    doctorId,
    total: v.total,
    avgOverall: v.total > 0 ? Math.round((v.sum / v.total) * 10) / 10 : 0,
    nps: v.total > 0 ? Math.round((v.promoters / v.total) * 100) : 0,
  }));

  return json(ok({ totalSurveys: total, averageOverall: avgOverall, byDept, byDoctor }), 200);
}

export const m589Routes: RouteDef[] = [
  // GET 列表 / POST 提交 / GET /ranking 已由 satisfactionSurvey.ts 注册在线，不重复
  { method: 'GET', path: '/api/v1/satisfaction-surveys/stats', handle: handleSsStats, auth: true },
];
