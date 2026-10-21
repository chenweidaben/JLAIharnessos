/**
 * 健澜科技 jlmedaios - M539 新标准 P0：在线问诊路由 2 端点
 *
 * GET  /api/v1/online-consults?patientId=   列表（createdAt 倒序）
 * POST /api/v1/online-consults                新建（后端按 urgency 自动算 priority 与 needsNurseTriage）
 *
 * 后端规则冻结：
 *   urgency=emergency → priority=1 + needsNurseTriage=true
 *   urgency=urgent    → priority=2 + needsNurseTriage=true
 *   urgency=routine   → priority=3 + needsNurseTriage=false
 *   初始 status='pending_triage'。
 * 写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500；枚举英文 key、number、ISO8601。
 * 与 M538 /postpartum/visits、M537 /oncology/followups 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Urgency = 'routine' | 'urgent' | 'emergency';
type ConsultStatus = 'pending_triage' | 'matched' | 'inProgress' | 'completed';

interface OnlineConsultRecord {
  id: string;
  patientId: string;
  deptCode: string;
  symptomSummary: string;
  chiefComplaint: string;
  urgency: Urgency;
  preferredDoctorId: string | null;
  attachments: string[];
  priority: number;
  needsNurseTriage: boolean;
  status: ConsultStatus;
  createdAt: string;
}

const URGENCIES: Urgency[] = ['routine', 'urgent', 'emergency'];

function derivePriority(urgency: Urgency): { priority: number; needsNurseTriage: boolean } {
  if (urgency === 'emergency') return { priority: 1, needsNurseTriage: true };
  if (urgency === 'urgent') return { priority: 2, needsNurseTriage: true };
  return { priority: 3, needsNurseTriage: false };
}

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const ocStore = new Map<string, OnlineConsultRecord>();
let ocSeq = 4;

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const seeds: OnlineConsultRecord[] = [
    {
      id: 'OC-001', patientId: 'P10001', deptCode: 'internal',
      symptomSummary: '胸痛伴大汗 30 分钟，含服硝酸甘油未缓解', chiefComplaint: '急性胸痛',
      urgency: 'emergency', preferredDoctorId: 'D-001', attachments: ['img-ecg-001.jpg'],
      priority: 1, needsNurseTriage: true, status: 'pending_triage', createdAt: iso(5),
    },
    {
      id: 'OC-002', patientId: 'P10002', deptCode: 'pediatrics',
      symptomSummary: '发热 38.9℃ 伴咳嗽 2 天', chiefComplaint: '小儿发热待查',
      urgency: 'urgent', preferredDoctorId: null, attachments: [],
      priority: 2, needsNurseTriage: true, status: 'pending_triage', createdAt: iso(30),
    },
    {
      id: 'OC-003', patientId: 'P10003', deptCode: 'general',
      symptomSummary: '随访血压控制情况', chiefComplaint: '高血压复诊',
      urgency: 'routine', preferredDoctorId: 'D-020', attachments: [],
      priority: 3, needsNurseTriage: false, status: 'matched', createdAt: iso(90),
    },
    {
      id: 'OC-004', patientId: 'P10004', deptCode: 'gynecology',
      symptomSummary: '早孕咨询，既往月经规律', chiefComplaint: '早孕建档咨询',
      urgency: 'routine', preferredDoctorId: null, attachments: ['img-us-001.png'],
      priority: 3, needsNurseTriage: false, status: 'completed', createdAt: iso(180),
    },
  ];
  seeds.forEach((r) => ocStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/online-consults 列表 ==============================

async function handleOcList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  let items = Array.from(ocStore.values());
  if (patientId) items = items.filter((r) => r.patientId === patientId);
  items = items.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/online-consults 新建 ==============================

async function handleOcCreate(c: Ctx): Promise<Response> {
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
  const deptCode = body.deptCode;
  const symptomSummary = body.symptomSummary;
  const chiefComplaint = body.chiefComplaint;
  const urgency = body.urgency;
  const preferredDoctorId = body.preferredDoctorId;
  const attachments = body.attachments;

  const attachArr: string[] = Array.isArray(attachments)
    ? attachments.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
    : [];

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof deptCode !== 'string' || !deptCode.trim() ||
    typeof chiefComplaint !== 'string' || !chiefComplaint.trim() ||
    typeof urgency !== 'string' || !URGENCIES.includes(urgency as Urgency) ||
    (symptomSummary != null && typeof symptomSummary !== 'string') ||
    (preferredDoctorId != null && typeof preferredDoctorId !== 'string')
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const urg = urgency as Urgency;
  const { priority, needsNurseTriage } = derivePriority(urg);

  ocSeq += 1;
  const record: OnlineConsultRecord = {
    id: `OC-${String(ocSeq).padStart(3, '0')}`,
    patientId: patientId.trim(),
    deptCode: deptCode.trim(),
    symptomSummary: typeof symptomSummary === 'string' ? symptomSummary.trim() : '',
    chiefComplaint: chiefComplaint.trim(),
    urgency: urg,
    preferredDoctorId:
      preferredDoctorId == null || !preferredDoctorId.trim()
        ? null
        : (preferredDoctorId as string).trim(),
    attachments: attachArr,
    priority,
    needsNurseTriage,
    status: 'pending_triage',
    createdAt: new Date().toISOString(),
  };
  ocStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m539Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/online-consults', handle: handleOcList, auth: true },
  { method: 'POST', path: '/api/v1/online-consults', handle: handleOcCreate, auth: true },
];
