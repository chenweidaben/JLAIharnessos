/**
 * 健澜科技 jlmedaios - M597 新标准 P13：医疗质量指标 5 GET 端点（只读）
 *
 * GET /api/v1/analytics/quality?period=                 月度质量总览
 * GET /api/v1/analytics/quality/infection-rate           院感发生率
 * GET /api/v1/analytics/quality/readmission-rate         再入院率
 * GET /api/v1/analytics/quality/mortality                  死亡率
 * GET /api/v1/analytics/quality/adverse-events            不良事件统计
 *
 * 种子 12 个月（2025-10 ~ 2026-09），8 科室；超阈值 warning=true。
 * 预警规则：院感率>3%、7天再入院率>5%、住院死亡率>2%。
 * 只读，不写内存 Map；模块加载时生成。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

// ============================== 种子数据（模块加载时生成） ==============================

const DEPTS = ['internal', 'surgery', 'pediatrics', 'obstetrics', 'gynecology', 'orthopedics', 'dermatology', 'ent'];
const PERIODS = [
  '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
  '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09',
];

interface MonthlyRow {
  period: string;
  infectionRate: number;
  readmission7Day: number;
  readmission31Day: number;
  mortalityRate: number;
  adverseEventCount: number;
}

function seedMonthly(): MonthlyRow[] {
  return PERIODS.map((period, i) => ({
    period,
    infectionRate: Math.round((2 + Math.random() * 2.5) * 100) / 100, // 2-4.5%
    readmission7Day: Math.round((3 + Math.random() * 3) * 100) / 100, // 3-6%
    readmission31Day: Math.round((6 + Math.random() * 4) * 100) / 100, // 6-10%
    mortalityRate: Math.round((1 + Math.random() * 1.5) * 100) / 100, // 1-2.5%
    adverseEventCount: Math.round(5 + Math.random() * 15),
  }));
}

const monthly = seedMonthly();

// ============================== 1. GET /api/v1/analytics/quality ==============================

async function handleOverview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const period = (c.query.get('period') ?? '').trim();

  let rows = monthly;
  if (period) rows = rows.filter((r) => r.period === period);

  const items = rows.map((r) => ({
    period: r.period,
    infectionRate: r.infectionRate,
    readmissionRate: r.readmission31Day,
    mortalityRate: r.mortalityRate,
    adverseEventCount: r.adverseEventCount,
    warning: r.infectionRate > 3 || r.readmission7Day > 5 || r.mortalityRate > 2,
  }));
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 2. GET /api/v1/analytics/quality/infection-rate ==============================

async function handleInfection(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const overallRate = Math.round(monthly.reduce((s, r) => s + r.infectionRate, 0) / monthly.length * 100) / 100;
  const byDept = DEPTS.map((dept, i) => {
    const rate = Math.round((2 + Math.random() * 2.5) * 100) / 100;
    return { deptCode: dept, rate, warning: rate > 3 };
  });

  return json(ok({
    overallRate,
    surgicalSite: Math.round(overallRate * 0.4 * 100) / 100,
    catheterRelated: Math.round(overallRate * 0.3 * 100) / 100,
    ventilatorAssociated: Math.round(overallRate * 0.3 * 100) / 100,
    byDept,
  }), 200);
}

// ============================== 3. GET /api/v1/analytics/quality/readmission-rate ==============================

async function handleReadmission(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const overall7Day = Math.round(monthly.reduce((s, r) => s + r.readmission7Day, 0) / monthly.length * 100) / 100;
  const overall31Day = Math.round(monthly.reduce((s, r) => s + r.readmission31Day, 0) / monthly.length * 100) / 100;
  const byDept = DEPTS.map((dept) => {
    const rate7Day = Math.round((3 + Math.random() * 3) * 100) / 100;
    const rate31Day = Math.round((6 + Math.random() * 4) * 100) / 100;
    return { deptCode: dept, rate7Day, rate31Day, warning: rate7Day > 5 };
  });

  return json(ok({ overall7Day, overall31Day, byDept }), 200);
}

// ============================== 4. GET /api/v1/analytics/quality/mortality ==============================

async function handleMortality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const inpatientMortality = Math.round(monthly.reduce((s, r) => s + r.mortalityRate, 0) / monthly.length * 100) / 100;
  const byDisease = ['heart_failure', 'pneumonia', 'sepsis', 'stroke', 'cancer'].map((diseaseCode) => {
    const rate = Math.round((1 + Math.random() * 2) * 100) / 100;
    return { diseaseCode, rate, warning: rate > 2 };
  });

  return json(ok({
    inpatientMortality,
    perioperativeMortality: Math.round(inpatientMortality * 0.3 * 100) / 100,
    byDisease,
  }), 200);
}

// ============================== 5. GET /api/v1/analytics/quality/adverse-events ==============================

async function handleAdverseEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const total = monthly.reduce((s, r) => s + r.adverseEventCount, 0);
  const byDept = DEPTS.map((dept) => ({
    deptCode: dept,
    count: Math.round(5 + Math.random() * 15),
  }));

  return json(ok({
    total,
    falls: Math.round(total * 0.3),
    pressureUlcers: Math.round(total * 0.25),
    medicationErrors: Math.round(total * 0.3),
    transfusionReactions: Math.round(total * 0.15),
    byDept,
  }), 200);
}

export const m597Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/analytics/quality', handle: handleOverview, auth: true },
  { method: 'GET', path: '/api/v1/analytics/quality/infection-rate', handle: handleInfection, auth: true },
  { method: 'GET', path: '/api/v1/analytics/quality/readmission-rate', handle: handleReadmission, auth: true },
  { method: 'GET', path: '/api/v1/analytics/quality/mortality', handle: handleMortality, auth: true },
  { method: 'GET', path: '/api/v1/analytics/quality/adverse-events', handle: handleAdverseEvents, auth: true },
];
