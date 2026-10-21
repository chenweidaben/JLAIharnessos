/**
 * 健澜科技 jlmedaios - M545 新标准 P0：护理 NQI 敏感指标 3 端点
 *
 * GET  /api/v1/nqi/indicators                     指标字典列表（5 条）
 * GET  /api/v1/nqi/indicators/:code/events         某指标下事件列表（reportedAt 倒序）；code 不存在 → 404
 * POST /api/v1/nqi/indicators/:code/events         上报事件（id=NQI- 前缀自增，缺必填 → 400）
 *
 * 种子：5 指标 × 每指标 3 事件 = 15 条事件，内存 Map 短路不连 PostgreSQL。
 * 字段英文枚举 key、number、ISO8601，与 M544 /patients/timeline、M543 /cds/checks 区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type IndicatorCode =
  | 'fallRate' | 'intensiveCareInfection' | 'pressureUlcer'
  | 'medicationError' | 'fallInjury';

interface Indicator {
  code: IndicatorCode;
  name: string;
  numerator: string;
  denominator: string;
  unit: string;
  description: string;
}

interface NqiEvent {
  id: string;
  indicatorCode: string;
  patientId: string;
  reportedAt: string;
  eventDescription: string;
  rootCause: string;
  improvementAction: string;
  reporterId: string;
}

// ============================== 指标字典（5 条） ==============================

const indicators: Indicator[] = [
  { code: 'fallRate', name: 'patient_fall_rate', numerator: 'inpatient_fall_events', denominator: 'inpatient_days', unit: '‰', description: 'Inpatient fall rate per 1000 inpatient days' },
  { code: 'intensiveCareInfection', name: 'icu_cauti_clabsi_rate', numerator: 'catheter_related_infections', denominator: 'device_days', unit: '‰', description: 'ICU catheter-related infection rate per 1000 device days' },
  { code: 'pressureUlcer', name: 'hospital_acquired_pressure_ulcer', numerator: 'stage2_above_pressure_ulcer', denominator: 'inpatients', unit: '%', description: 'Hospital-acquired stage 2+ pressure ulcer rate' },
  { code: 'medicationError', name: 'medication_error_rate', numerator: 'medication_error_events', denominator: 'medication_administrations', unit: '‰', description: 'Medication error rate per 1000 administrations' },
  { code: 'fallInjury', name: 'fall_with_injury_rate', numerator: 'fall_with_injury_events', denominator: 'inpatient_fall_events', unit: '%', description: 'Proportion of falls resulting in injury' },
];

// ============================== 事件种子（每指标 3 条） ==============================

const eventStore = new Map<string, NqiEvent[]>();
let eventSeq = 0;

function addEvent(indicatorCode: string, patientId: string, reportedAt: string, eventDescription: string, rootCause: string, improvementAction: string, reporterId: string): void {
  eventSeq += 1;
  const ev: NqiEvent = {
    id: `NQI-${String(eventSeq).padStart(3, '0')}`,
    indicatorCode, patientId, reportedAt, eventDescription, rootCause, improvementAction, reporterId,
  };
  const list = eventStore.get(indicatorCode) ?? [];
  list.push(ev);
  eventStore.set(indicatorCode, list);
}

function seedEvents(): void {
  // fallRate × 3
  addEvent('fallRate', 'P-A001', '2026-10-12T09:30:00+08:00', 'Night shift patient fell beside bed, no injury.', 'Bed side rail not raised; sedative medication given.', 'Reinforce bed rail protocol; round hourly at night.', 'N-NAN-001');
  addEvent('fallRate', 'P-A002', '2026-10-16T14:10:00+08:00', 'Patient tried to get up to toilet alone, slipped.', 'Call bell not within reach; Morse score not updated.', 'Update Morse score daily; ensure call bell within reach.', 'N-NAN-002');
  addEvent('fallRate', 'P-A003', '2026-10-20T06:45:00+08:00', 'Morning dizziness, fell while walking to bathroom.', 'Orthostatic hypotension after antihypertensive dose.', 'Assess orthostatic BP; assist bathroom in morning.', 'N-NAN-003');

  // intensiveCareInfection × 3
  addEvent('intensiveCareInfection', 'P-B001', '2026-10-11T10:00:00+08:00', 'CAUTI confirmed after 5 days of urinary catheter.', 'Catheter care bundle not fully followed.', 'Re-audit CAUTI bundle daily; remove catheter ASAP.', 'N-ICU-001');
  addEvent('intensiveCareInfection', 'P-B002', '2026-10-15T15:30:00+08:00', 'CLABSI suspected after central line placement.', 'Sterile barrier technique gap during line insertion.', 'Re-train insertion team on maximal barrier precaution.', 'N-ICU-002');
  addEvent('intensiveCareInfection', 'P-B003', '2026-10-19T08:20:00+08:00', 'VAP suspected, ventilated for 6 days.', 'Head of bed maintained below 30 degrees.', 'Enforce HOB 30-45 degrees daily audit.', 'N-ICU-003');

  // pressureUlcer × 3
  addEvent('pressureUlcer', 'P-C001', '2026-10-13T11:00:00+08:00', 'Stage 2 sacral pressure ulcer on bedridden patient.', 'Turning schedule not adhered to; Braden not updated.', 'Two-hourly turning; update Braden every shift.', 'N-WRD-001');
  addEvent('pressureUlcer', 'P-C002', '2026-10-17T09:15:00+08:00', 'Heel pressure injury stage 1 observed.', 'Heel elevation device not applied.', 'Apply heel suspension boots for all bedridden patients.', 'N-WRD-002');
  addEvent('pressureUlcer', 'P-C003', '2026-10-21T16:40:00+08:00', 'Stage 2 coccyx ulcer in post-op patient.', 'Nutrition intake poor; moisture incontinence.', 'Add pressure-relief mattress; improve nutrition consult.', 'N-WRD-003');

  // medicationError × 3
  addEvent('medicationError', 'P-D001', '2026-10-14T08:30:00+08:00', 'Wrong dose of warfarin administered (10mg vs 5mg ordered).', 'Barcode scan skipped; manual override used.', 'Enforce mandatory barcode scanning; no manual override.', 'N-MED-001');
  addEvent('medicationError', 'P-D002', '2026-10-18T13:20:00+08:00', 'Metformin given to patient who had CT contrast that morning.', 'Metformin hold protocol not flagged in MAR.', 'Auto-hold metformin for 48h after contrast in CDS.', 'N-MED-002');
  addEvent('medicationError', 'P-D003', '2026-10-21T10:05:00+08:00', 'Double dosing of amlodipine (two shifts both gave).', 'MAR not updated after first administration.', 'Require MAR timestamp before next dose.', 'N-MED-003');

  // fallInjury × 3
  addEvent('fallInjury', 'P-E001', '2026-10-15T07:50:00+08:00', 'Fell in bathroom, hit head, scalp laceration 2cm.', 'No bathroom assist call; floor wet.', 'Add non-slip mat; bathroom call bell installed.', 'N-NAN-004');
  addEvent('fallInjury', 'P-E002', '2026-10-19T21:30:00+08:00', 'Fell off wheelchair, wrist bruising.', 'Wheelchair brake not applied during transfer.', 'Two-person transfer for high-risk patients.', 'N-NAN-005');
  addEvent('fallInjury', 'P-E003', '2026-10-21T23:10:00+08:00', 'Fell while smoking in ward, arm abrasion.', 'Unauthorized smoking; no fall risk education.', 'Smoking cessation counseling; fall risk signage.', 'N-NAN-006');
}
seedEvents();

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [
        { severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` },
      ],
    },
    404,
  );
}

function findIndicator(code: string): Indicator | undefined {
  return indicators.find((x) => x.code === code);
}

// ============================== 1. GET /api/v1/nqi/indicators 字典列表 ==============================

async function handleIndicatorList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  return json(ok({ items: indicators, totalCount: indicators.length }), 200);
}

// ============================== 2. GET /api/v1/nqi/indicators/:code/events 事件列表 ==============================

async function handleEventList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const code = (c.params.code ?? '').trim();
  if (!findIndicator(code)) return notFound('NqiIndicator', code);
  const list = (eventStore.get(code) ?? []).slice().sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  return json(ok({ indicatorCode: code, items: list, totalCount: list.length }), 200);
}

// ============================== 3. POST /api/v1/nqi/indicators/:code/events 上报事件 ==============================

async function handleEventCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const code = (c.params.code ?? '').trim();
  if (!findIndicator(code)) return notFound('NqiIndicator', code);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const patientId = body.patientId;
  const eventDescription = body.eventDescription;
  const rootCause = body.rootCause;
  const improvementAction = body.improvementAction;
  const reporterId = body.reporterId;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof eventDescription !== 'string' || !eventDescription.trim() ||
    typeof rootCause !== 'string' || !rootCause.trim() ||
    typeof improvementAction !== 'string' || !improvementAction.trim() ||
    typeof reporterId !== 'string' || !reporterId.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  eventSeq += 1;
  const ev: NqiEvent = {
    id: `NQI-${String(eventSeq).padStart(3, '0')}`,
    indicatorCode: code,
    patientId: patientId.trim(),
    reportedAt: new Date().toISOString(),
    eventDescription: eventDescription.trim(),
    rootCause: rootCause.trim(),
    improvementAction: improvementAction.trim(),
    reporterId: reporterId.trim(),
  };
  const list = eventStore.get(code) ?? [];
  list.push(ev);
  eventStore.set(code, list);
  return json(ok(ev), 200);
}

export const m545Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nqi/indicators', handle: handleIndicatorList, auth: true },
  { method: 'GET', path: '/api/v1/nqi/indicators/:code/events', handle: handleEventList, auth: true },
  { method: 'POST', path: '/api/v1/nqi/indicators/:code/events', handle: handleEventCreate, auth: true },
];
