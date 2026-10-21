/**
 * 健澜科技 jlmedaios - M603 新标准 P15：绩效考核 5 端点
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Period = 'monthly' | 'quarterly' | 'annual';

interface AssessmentRecord {
  id: string;
  staffId: string;
  staffName: string;
  deptCode: string;
  period: Period;
  categories: {
    clinicalQuality: number;
    workload: number;
    teaching: number;
    research: number;
    patientSatisfaction: number;
  };
  overallScore: number;
  assessedBy: string;
  assessedAt: string;
  feedback: {
    feedbackBy: string;
    feedbackContent: string;
    employeeResponse: string;
    feedbackAt: string;
  } | null;
  createdAt: string;
}

const perfStore = new Map<string, AssessmentRecord>();
let perfSeq = 0;

function addAssessment(r: Omit<AssessmentRecord, 'id' | 'feedback'>): AssessmentRecord {
  perfSeq += 1;
  const rec: AssessmentRecord = { ...r, id: `PERF-${String(perfSeq).padStart(3, '0')}`, feedback: null };
  perfStore.set(rec.id, rec);
  return rec;
}

function seedAssessments(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const depts = ['DEPT-INT', 'DEPT-SURG', 'DEORT', 'DEPT-PED', 'DEPT-GYN'];
  const names = ['张伟', '李娜', '王强', '刘洋', '陈静', '杨明', '赵芳', '孙磊', '周敏', '吴刚'];
  const periods: Period[] = ['monthly', 'quarterly', 'annual'];
  for (let i = 0; i < 50; i += 1) {
    const cq = 70 + (i % 30);
    const wl = 65 + (i % 35);
    const th = 60 + (i % 40);
    const rs = 55 + (i % 45);
    const ps = 75 + (i % 25);
    const overall = Math.round((cq * 0.35 + wl * 0.25 + th * 0.15 + rs * 0.15 + ps * 0.1));
    addAssessment({
      staffId: `STF-${String(i + 1).padStart(3, '0')}`,
      staffName: names[i % names.length],
      deptCode: depts[i % depts.length],
      period: periods[i % periods.length],
      categories: { clinicalQuality: cq, workload: wl, teaching: th, research: rs, patientSatisfaction: ps },
      overallScore: overall,
      assessedBy: 'admin',
      assessedAt: iso(i * 60),
      createdAt: iso(i),
    });
  }
}

seedAssessments();

async function handleAssessmentList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const staffId = (c.query.get('staffId') ?? '').trim();
  const period = (c.query.get('period') ?? '').trim();
  let items = Array.from(perfStore.values());
  if (staffId) items = items.filter((r) => r.staffId === staffId);
  if (period) items = items.filter((r) => r.period === period);
  items.sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
  return json(ok({ items, totalCount: items.length }), 200);
}

async function handleAssessmentCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  let body: Record<string, unknown> | null = null;
  try { body = await c.body<Record<string, unknown>>(); } catch { body = null; }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);
  const cats_raw = (body.categories || {}) as Record<string, unknown>;
  const cats = {
    clinicalQuality: Number(cats_raw.clinicalQuality || 0),
    workload: Number(cats_raw.workload || 0),
    teaching: Number(cats_raw.teaching || 0),
    research: Number(cats_raw.research || 0),
    patientSatisfaction: Number(cats_raw.patientSatisfaction || 0),
  };
  const computed = Math.round(
    cats.clinicalQuality * 0.35 +
      cats.workload * 0.25 +
      cats.teaching * 0.15 +
      cats.research * 0.15 +
      cats.patientSatisfaction * 0.1,
  );
  const declared = Number(body.overallScore || 0);
  if (Math.abs(computed - declared) > 5) {
    return json({ code: 400, message: 'overall_score_mismatch', computed }, 400);
  }
  const rec = addAssessment({
    staffId: typeof body.staffId === 'string' ? body.staffId : '',
    staffName: typeof body.staffName === 'string' ? body.staffName : '',
    deptCode: typeof body.deptCode === 'string' ? body.deptCode : '',
    period: (typeof body.period === 'string' ? body.period : 'monthly') as Period,
    categories: cats,
    overallScore: declared,
    assessedBy: typeof body.assessedBy === 'string' ? body.assessedBy : '',
    assessedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

async function handleAssessmentFeedback(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = perfStore.get(id);
  if (!rec) return json({ code: 404, message: 'not_found' }, 404);
  if (rec.feedback) return json({ code: 409, message: 'already_feedback' }, 409);
  let body: Record<string, unknown> | null = null;
  try { body = await c.body<Record<string, unknown>>(); } catch { body = null; }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);
  rec.feedback = {
    feedbackBy: typeof body.feedbackBy === 'string' ? body.feedbackBy : '',
    feedbackContent: typeof body.feedbackContent === 'string' ? body.feedbackContent : '',
    employeeResponse: typeof body.employeeResponse === 'string' ? body.employeeResponse : '',
    feedbackAt: new Date().toISOString(),
  };
  return json(ok(rec.feedback), 200);
}

async function handleDeptSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  let items = Array.from(perfStore.values());
  if (deptCode) items = items.filter((r) => r.deptCode === deptCode);
  if (items.length === 0) return json(ok({ items: [], totalCount: 0 }), 200);
  const avg = Math.round((items.reduce((s, r) => s + r.overallScore, 0) / items.length) * 10) / 10;
  const excellent = items.filter((r) => r.overallScore >= 90).length;
  const pass = items.filter((r) => r.overallScore >= 60).length;
  return json(ok({
    deptCode: deptCode || 'ALL',
    sampleSize: items.length,
    avgScore: avg,
    excellentRate: Math.round((excellent / items.length) * 1000) / 10,
    passRate: Math.round((pass / items.length) * 1000) / 10,
  }), 200);
}

async function handleRankings(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  let items = Array.from(perfStore.values());
  if (deptCode) items = items.filter((r) => r.deptCode === deptCode);
  items.sort((a, b) => b.overallScore - a.overallScore);
  return json(ok({ items: items.slice(0, 20), totalCount: items.length }), 200);
}

export const m603Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/performance/assessments', handle: handleAssessmentList, auth: true },
  { method: 'POST', path: '/api/v1/performance/assessments', handle: handleAssessmentCreate, auth: true },
  { method: 'POST', path: '/api/v1/performance/assessments/:id/feedback', handle: handleAssessmentFeedback, auth: true },
  { method: 'GET', path: '/api/v1/performance/dept-summary', handle: handleDeptSummary, auth: true },
  { method: 'GET', path: '/api/v1/performance/rankings', handle: handleRankings, auth: true },
];
