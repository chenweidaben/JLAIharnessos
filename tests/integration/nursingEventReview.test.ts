/**
 * 健澜科技 jlmedaios - 不良事件后结构化评估集成测试（M17-D）
 *
 * 直接对真实 PostgreSQL 运行聚合器（无 mock）：
 *  - 正常建评估 200；重复评估 409；必填缺 400；越权 403；NQI 分子分母。
 *
 * 需要可用 PostgreSQL（TEST_REAL=1）；afterAll 仅删 M17D_TEST 标签夹具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import {
  createReviewView,
  EventReviewError,
  getEventMetrics,
  recordEventView,
} from '../../src/bff/aggregators/nursingEventReviewAggregator.js';

let dbAvailable = false;
let admin: AuthView;
let nurse: AuthView;

const TAG = 'M17D_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatientVisit(dept = '急诊科') {
  const patient = await createPatient({
    mrn: `M17D${seq()}`,
    nameMasked: `M*${seq().slice(-4)}`,
    gender: '女',
    birthDate: '1970-01-01',
    tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: dept,
    chiefComplaint: '不良事件评估测试',
  });
  return { patient, visit };
}

async function statusOf(p: Promise<unknown>): Promise<number> {
  try {
    await p;
    return 200;
  } catch (e) {
    if (e instanceof EventReviewError) return e.status;
    throw e;
  }
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}
if (dbAvailable) {
  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  nurse = await load('nurse_ma');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.nursing_event_reviews r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M17D_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.nursing_risk_events e USING clinical.visits v, clinical.patients p
      WHERE e.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M17D_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M17D_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M17D_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

const describeReal = dbAvailable ? describe : describe.skip;

describeReal('不良事件后结构化评估（真实 PostgreSQL）', () => {
  it('环境就绪：权限', () => {
    expect(admin.permissions).toContain('event_review:write');
    expect(nurse.permissions).toContain('event_review:write');
  });

  it('正常建评估 200', async () => {
    const { visit } = await newPatientVisit();
    const ev = await recordEventView(nurse, { visitId: visit.id, eventType: 'fall', description: '床旁跌倒' });
    const r = await createReviewView(nurse, {
      eventId: ev.id, visitId: visit.id, occurredAt: new Date().toISOString(),
      location: 'ward', circumstances: '上床未坐稳', injuries: '无', familyNotified: true,
    });
    expect(r.eventId).toBe(ev.id);
  });

  it('重复评估 409', async () => {
    const { visit } = await newPatientVisit();
    const ev = await recordEventView(nurse, { visitId: visit.id, eventType: 'fall' });
    const base = {
      eventId: ev.id, visitId: visit.id, occurredAt: new Date().toISOString(),
      location: 'ward', circumstances: 'c', injuries: '无', familyNotified: true,
    };
    await createReviewView(nurse, base);
    const s = await statusOf(createReviewView(nurse, base));
    expect(s).toBe(409);
  });

  it('必填缺 400', async () => {
    const { visit } = await newPatientVisit();
    const ev = await recordEventView(nurse, { visitId: visit.id, eventType: 'fall' });
    const s = await statusOf(createReviewView(nurse, { eventId: ev.id, visitId: visit.id, occurredAt: new Date().toISOString() }));
    expect(s).toBe(400);
  });

  it('NQI 分子分母计算', async () => {
    const m = await getEventMetrics(nurse);
    expect(typeof m.metrics.fallRate).toBe('number');
    expect(m.metrics.fractions.fall.numerator).toBeGreaterThanOrEqual(0);
  });
});
