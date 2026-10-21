/**
 * 健澜科技 jlmedaios - M554 新标准 P3：不良事件上报闭环 3 端点
 *
 * GET  /api/v1/adverse-events?deptCode=&severity=&status=   列表（reportedAt 倒序；三参数过滤）
 * POST /api/v1/adverse-events                              新建（status='reported'）
 * POST /api/v1/adverse-events/:id/review                   根因评审（reported/under_review → closed；已 closed → 409 already_closed）
 *
 * 种子 10 条：near_miss/minor/moderate/major/catastrophic 五档严重度全覆盖；6 closed + 3 under_review + 1 reported。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type EventType = 'fall' | 'medication_error' | 'device_error' | 'infection' | 'other';
const EVENT_TYPES: EventType[] = ['fall', 'medication_error', 'device_error', 'infection', 'other'];

type Severity = 'near_miss' | 'minor' | 'moderate' | 'major' | 'catastrophic';
const SEVERITIES: Severity[] = ['near_miss', 'minor', 'moderate', 'major', 'catastrophic'];

type AeStatus = 'reported' | 'under_review' | 'closed';

interface AeRecord {
  id: string;
  patientId: string;
  eventType: EventType;
  eventDate: string;
  deptCode: string;
  description: string;
  severity: Severity;
  reporter: string;
  status: AeStatus;
  rootCause: string | null;
  improvementAction: string | null;
  reviewResult: 'accepted' | 'rejected' | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reportedAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const aeStore = new Map<string, AeRecord>();
let aeSeq = 0;

function addAe(r: Omit<AeRecord, 'id'>): AeRecord {
  aeSeq += 1;
  const rec: AeRecord = { ...r, id: `AE-${String(aeSeq).padStart(3, '0')}` };
  aeStore.set(rec.id, rec);
  return rec;
}

function seedAe(): void {
  const now = Date.now();
  const isoRep = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const isoEvent = (offsetDays: number): string => new Date(now - offsetDays * 86_400_000).toISOString();

  // 6 条已 closed
  addAe({ patientId: 'P-A001', eventType: 'fall', eventDate: isoEvent(20), deptCode: 'internal', description: '夜间如厕跌倒致右侧髋部挫伤', severity: 'moderate', reporter: 'NURSE-IN-001', status: 'closed', rootCause: '床栏未拉起+夜间起身照明不足', improvementAction: '加装感应夜灯、强化床栏使用宣教', reviewResult: 'accepted', reviewedBy: 'QA-DIRECTOR', reviewedAt: isoRep(60 * 24), reportedAt: isoRep(60 * 72) });
  addAe({ patientId: 'P-A002', eventType: 'medication_error', eventDate: isoEvent(15), deptCode: 'internal', description: '同药重复开具 2 倍剂量', severity: 'major', reporter: 'PHYSICIAN-001', status: 'closed', rootCause: '医嘱系统未触发重复开药拦截', improvementAction: '上线 CDS 重复用药规则', reviewResult: 'accepted', reviewedBy: 'QA-DIRECTOR', reviewedAt: isoRep(60 * 36), reportedAt: isoRep(60 * 60) });
  addAe({ patientId: 'P-A003', eventType: 'device_error', eventDate: isoEvent(10), deptCode: 'ICU', description: '输液泵流速异常报警未及时处置', severity: 'minor', reporter: 'NURSE-ICU-001', status: 'closed', rootCause: '交接班遗漏未交接报警', improvementAction: '完善交接班 checklist', reviewResult: 'accepted', reviewedBy: 'QA-DIRECTOR', reviewedAt: isoRep(60 * 24), reportedAt: isoRep(60 * 48) });
  addAe({ patientId: 'P-A004', eventType: 'infection', eventDate: isoEvent(7), deptCode: 'ICU', description: '中心静脉导管相关血流感染', severity: 'major', reporter: 'NURSE-ICU-002', status: 'closed', rootCause: '导管维护无菌操作不规范', improvementAction: '导管维护标准化培训考核', reviewResult: 'accepted', reviewedBy: 'QA-DIRECTOR', reviewedAt: isoRep(60 * 18), reportedAt: isoRep(60 * 36) });
  addAe({ patientId: 'P-A005', eventType: 'other', eventDate: isoEvent(5), deptCode: 'surgery', description: '标本贴错标签（患者主动发现）', severity: 'near_miss', reporter: 'PATIENT-FAMILY', status: 'closed', rootCause: '标本核对环节双人核对未落实', improvementAction: '强制双人扫码核对', reviewResult: 'accepted', reviewedBy: 'QA-DIRECTOR', reviewedAt: isoRep(60 * 12), reportedAt: isoRep(60 * 24) });
  addAe({ patientId: 'P-A006', eventType: 'medication_error', eventDate: isoEvent(3), deptCode: 'pediatrics', description: '儿童剂量计算偏差（已纠正）', severity: 'near_miss', reporter: 'PHARMACIST-001', status: 'closed', rootCause: '药师发药前未按体重复核', improvementAction: '上线儿童剂量自动校验', reviewResult: 'accepted', reviewedBy: 'QA-DIRECTOR', reviewedAt: isoRep(60 * 6), reportedAt: isoRep(60 * 12) });

  // 3 条 under_review
  addAe({ patientId: 'P-A007', eventType: 'fall', eventDate: isoEvent(2), deptCode: 'geriatrics', description: '助行器使用不当跌倒', severity: 'minor', reporter: 'NURSE-GER-001', status: 'under_review', rootCause: null, improvementAction: null, reviewResult: null, reviewedBy: null, reviewedAt: null, reportedAt: isoRep(60 * 8) });
  addAe({ patientId: 'P-A008', eventType: 'medication_error', eventDate: isoEvent(1), deptCode: 'internal', description: '皮试结果误判', severity: 'moderate', reporter: 'NURSE-IN-002', status: 'under_review', rootCause: null, improvementAction: null, reviewResult: null, reviewedBy: null, reviewedAt: null, reportedAt: isoRep(60 * 4) });
  addAe({ patientId: 'P-A009', eventType: 'device_error', eventDate: isoEvent(1), deptCode: 'surgery', description: '电刀负极板接触不良烫伤', severity: 'catastrophic', reporter: 'SURGEON-002', status: 'under_review', rootCause: null, improvementAction: null, reviewResult: null, reviewedBy: null, reviewedAt: null, reportedAt: isoRep(60 * 2) });

  // 1 条 reported
  addAe({ patientId: 'P-A010', eventType: 'other', eventDate: isoEvent(0), deptCode: 'emergency', description: '急救通道拥堵延误转运 5 分钟', severity: 'moderate', reporter: 'DOCTOR-ER-001', status: 'reported', rootCause: null, improvementAction: null, reviewResult: null, reviewedBy: null, reviewedAt: null, reportedAt: isoRep(30) });
}
seedAe();

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

// ============================== 1. GET /api/v1/adverse-events ==============================

async function handleAeList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  const severity = (c.query.get('severity') ?? '').trim();
  const status = (c.query.get('status') ?? '').trim();

  let rows = Array.from(aeStore.values());
  if (deptCode) rows = rows.filter((r) => r.deptCode === deptCode);
  if (severity) rows = rows.filter((r) => r.severity === severity);
  if (status) rows = rows.filter((r) => r.status === status);
  rows = rows.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/adverse-events ==============================

async function handleAeCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const patientId = body.patientId;
  const eventType = body.eventType;
  const eventDate = body.eventDate;
  const deptCode = body.deptCode;
  const description = body.description;
  const severity = body.severity;
  const reporter = body.reporter;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof eventType !== 'string' || !EVENT_TYPES.includes(eventType as EventType) ||
    typeof eventDate !== 'string' || !eventDate.trim() ||
    typeof deptCode !== 'string' || !deptCode.trim() ||
    typeof description !== 'string' || !description.trim() ||
    typeof severity !== 'string' || !SEVERITIES.includes(severity as Severity) ||
    typeof reporter !== 'string' || !reporter.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addAe({
    patientId: patientId.trim(),
    eventType: eventType as EventType,
    eventDate: eventDate.trim(),
    deptCode: deptCode.trim(),
    description: description.trim(),
    severity: severity as Severity,
    reporter: reporter.trim(),
    status: 'reported',
    rootCause: null,
    improvementAction: null,
    reviewResult: null,
    reviewedBy: null,
    reviewedAt: null,
    reportedAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/adverse-events/:id/review ==============================

async function handleAeReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = aeStore.get(id);
  if (!rec) return notFound('AdverseEvent', id);

  if (rec.status === 'closed') {
    return json({ code: 409, message: 'already_closed' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const rootCause = body.rootCause;
  const improvementAction = body.improvementAction;
  const reviewResult = body.reviewResult;
  const reviewedBy = body.reviewedBy;

  if (
    typeof rootCause !== 'string' || !rootCause.trim() ||
    typeof improvementAction !== 'string' || !improvementAction.trim() ||
    typeof reviewResult !== 'string' || (reviewResult !== 'accepted' && reviewResult !== 'rejected') ||
    typeof reviewedBy !== 'string' || !reviewedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.rootCause = rootCause.trim();
  rec.improvementAction = improvementAction.trim();
  rec.reviewResult = reviewResult as 'accepted' | 'rejected';
  rec.reviewedBy = reviewedBy.trim();
  rec.reviewedAt = new Date().toISOString();
  rec.status = 'closed';
  return json(ok(rec), 200);
}

export const m554Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/adverse-events', handle: handleAeList, auth: true },
  { method: 'POST', path: '/api/v1/adverse-events', handle: handleAeCreate, auth: true },
  { method: 'POST', path: '/api/v1/adverse-events/:id/review', handle: handleAeReview, auth: true },
];
