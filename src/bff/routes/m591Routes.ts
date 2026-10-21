/**
 * 健澜科技 jlmedaios - M591 新标准 P12：健康教育 4 端点
 *
 * GET    /api/v1/health-education?patientId=&topic=   列表（assignedAt 倒序；过滤）
 * POST   /api/v1/health-education/assign                 分配（id=HE- 前缀自增）
 * POST   /api/v1/health-education/:id/viewed             患者已读（已 viewed → 409 already_viewed）
 * POST   /api/v1/health-education/:id/feedback          患者反馈（rating 1-5 校验）
 *
 * 种子 30 条：10 已读（viewedAt 非空）、5 已反馈（feedbackAt 非空）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Topic = 'hypertension' | 'diabetes' | 'post_surgery' | 'nutrition' | 'medication';

interface HeRecord {
  id: string;
  patientId: string;
  topic: Topic;
  assignedBy: string;
  assignedAt: string;
  viewedAt: string | null;
  rating: number | null;
  comments: string | null;
  feedbackAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const heStore = new Map<string, HeRecord>();
let heSeq = 0;

function addHe(r: Omit<HeRecord, 'id'>): HeRecord {
  heSeq += 1;
  const rec: HeRecord = { ...r, id: `HE-${String(heSeq).padStart(3, '0')}` };
  heStore.set(rec.id, rec);
  return rec;
}

function seedHe(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const topics: Topic[] = ['hypertension', 'diabetes', 'post_surgery', 'nutrition', 'medication'];

  // 30 条种子：前 10 已读（viewedAt 非空），其中前 5 已反馈
  for (let i = 1; i <= 30; i++) {
    const isViewed = i <= 10;
    const isFeedback = i <= 5;
    addHe({
      patientId: `P-H${String(i).padStart(3, '0')}`,
      topic: topics[i % 5],
      assignedBy: `DOC-HE-${(i % 10) + 1}`,
      assignedAt: iso(60 * 24 * (30 - i)),
      viewedAt: isViewed ? iso(60 * 24 * (30 - i) - 60) : null,
      rating: isFeedback ? ((i % 5) + 1) : null,
      comments: isFeedback ? `反馈${i}` : null,
      feedbackAt: isFeedback ? iso(60 * 24 * (30 - i) - 120) : null,
      createdAt: iso(60 * 24 * (30 - i)),
    });
  }
}
seedHe();

const VALID_TOPICS: Topic[] = ['hypertension', 'diabetes', 'post_surgery', 'nutrition', 'medication'];

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` }],
    },
    404,
  );
}

// ============================== 1. GET /api/v1/health-education ==============================

async function handleHeList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const topic = (c.query.get('topic') ?? '').trim();
  let rows = Array.from(heStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (topic) rows = rows.filter((r) => r.topic === topic);
  rows = rows.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/health-education/assign ==============================

async function handleHeAssign(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { patientId, topic, assignedBy } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof assignedBy !== 'string' || !assignedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof topic !== 'string' || !VALID_TOPICS.includes(topic as Topic)) {
    return json({ code: 400, message: 'invalid_topic' }, 400);
  }

  const now = new Date().toISOString();
  const rec = addHe({
    patientId: patientId.trim(),
    topic: topic as Topic,
    assignedBy: assignedBy.trim(),
    assignedAt: now,
    viewedAt: null,
    rating: null,
    comments: null,
    feedbackAt: null,
    createdAt: now,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/health-education/:id/viewed ==============================

async function handleHeViewed(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = heStore.get(id);
  if (!rec) return notFound('HealthEducation', id);

  if (rec.viewedAt) {
    return json({ code: 409, message: 'already_viewed' }, 409);
  }
  rec.viewedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

// ============================== 4. POST /api/v1/health-education/:id/feedback ==============================

async function handleHeFeedback(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = heStore.get(id);
  if (!rec) return notFound('HealthEducation', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { rating, comments } = body as Record<string, unknown>;
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return json({ code: 400, message: 'rating_out_of_range' }, 400);
  }

  rec.rating = rating;
  rec.comments = typeof comments === 'string' && comments.trim() ? comments.trim() : null;
  rec.feedbackAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m591Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/health-education', handle: handleHeList, auth: true },
  { method: 'POST', path: '/api/v1/health-education/assign', handle: handleHeAssign, auth: true },
  { method: 'POST', path: '/api/v1/health-education/:id/viewed', handle: handleHeViewed, auth: true },
  { method: 'POST', path: '/api/v1/health-education/:id/feedback', handle: handleHeFeedback, auth: true },
];
