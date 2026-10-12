/**
 * 健澜科技 jlmedaios - 不良事件后结构化评估聚合器（M17-D）
 *
 * 复用 inpatientCareAggregator.canAccessVisit（越权 403）。
 * 跌倒后评估必填项缺 -> 400；一事件一份评估（重复 409）；本人 reviewed_by；recordChainAudit。
 * NQI_PRESSURE_INJURY/NQI_FALL_INCIDENT 由纯函数 computeEventRates 计算。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import {
  createEvent,
  listEvents,
  type NursingRiskEvent,
  type RiskEventType,
} from '../../db/repositories/nursingRiskRepo.js';
import {
  countInpatientVisits,
  getReviewByEventId,
  insertReview,
  listReviews,
  type EventReview,
  type NewReview,
} from '../../db/repositories/nursingEventReviewRepo.js';
import {
  computeEventRates,
  missingFallReviewFields,
  type RiskLevel,
} from '../../medical-tools/nursing/eventReview.js';

export class EventReviewError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'EventReviewError';
  }
}
const badRequest = (m: string) => new EventReviewError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new EventReviewError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new EventReviewError(409, 'CONFLICT', m);
const forbidden = (m: string) => new EventReviewError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围，无法操作该患者');
  return visit;
}

// ---------------------------------------------------------------------------
// 登记事件（压疮分级 / 跌倒）
// ---------------------------------------------------------------------------

export async function recordEventView(
  auth: AuthView,
  input: { visitId: string; eventType: RiskEventType; description?: string },
): Promise<NursingRiskEvent> {
  assertPermission(auth, 'event_review:write');
  assertUuid(input.visitId, '就诊');
  const visit = await loadVisit(auth, input.visitId);
  return withTx(async (tx) => {
    const ev = await createEvent(
      {
        visitId: visit.id,
        riskType: input.eventType === 'fall' ? 'fall' : 'pressure_ulcer',
        eventType: input.eventType,
        description: input.description ?? null,
        recordedBy: auth.id,
      },
      tx,
    );
    await recordChainAudit(
      { actorId: auth.id, action: 'event_review.record_event', resourceType: 'visit', resourceId: visit.id, result: 'success', riskLevel: 'high', detail: { eventId: ev.id, eventType: input.eventType } },
      tx,
    );
    return ev;
  });
}

// ---------------------------------------------------------------------------
// 结构化评估（一事件一份）
// ---------------------------------------------------------------------------

export async function createReviewView(
  auth: AuthView,
  input: Omit<NewReview, 'reviewedBy'>,
): Promise<EventReview> {
  assertPermission(auth, 'event_review:write');
  assertUuid(input.eventId, '事件');
  assertUuid(input.visitId, '就诊');
  await loadVisit(auth, input.visitId);

  // 跌倒后评估必填项校验
  const missing = missingFallReviewFields({
    occurredAt: input.occurredAt,
    location: input.location ?? undefined,
    circumstances: input.circumstances ?? undefined,
    injuries: input.injuries ?? undefined,
    familyNotified: input.familyNotified ?? undefined,
  });
  if (missing.length > 0) throw badRequest(`跌倒后评估缺少必填项：${missing.join('、')}`);

  const existing = await getReviewByEventId(input.eventId);
  if (existing) throw conflict('该事件已存在结构化评估（一事件一份）');

  return withTx(async (tx) => {
    const review = await insertReview({ ...input, reviewedBy: auth.id }, tx);
    await recordChainAudit(
      { actorId: auth.id, action: 'event_review.create', resourceType: 'visit', resourceId: input.visitId, result: 'success', riskLevel: 'medium', detail: { eventId: input.eventId, reviewId: review.id, rescore: input.riskRescoreLevel ?? null } },
      tx,
    );
    return review;
  });
}

// ---------------------------------------------------------------------------
// 查询
// ---------------------------------------------------------------------------

export async function listReviewsView(auth: AuthView, visitId?: string) {
  assertPermission(auth, 'event_review:read');
  return listReviews(visitId);
}

export async function listEventsView(auth: AuthView, visitId?: string) {
  assertPermission(auth, 'event_review:read');
  return listEvents(visitId ? { visitId } : {});
}

// ---------------------------------------------------------------------------
// NQI
// ---------------------------------------------------------------------------

export async function getEventMetrics(auth: AuthView) {
  assertPermission(auth, 'event_review:read');
  const events = await listEvents({});
  const inpatientVisits = await countInpatientVisits();
  const rates = computeEventRates(
    events.map((e) => ({ eventType: e.eventType })),
    inpatientVisits,
  );
  return { totalEvents: events.length, inpatientVisits, metrics: rates };
}
