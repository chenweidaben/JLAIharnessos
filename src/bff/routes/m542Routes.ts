/**
 * 健澜科技 jlmedaios - M542 新标准 P0：病历版本管理 3 端点
 *
 * GET  /api/v1/medical-records/:id/versions          版本列表（versionNo 倒序），404 OperationOutcome
 * POST /api/v1/medical-records/:id/versions          新建版本（版本号自增；最新 locked → 409 状态机拦截）
 * GET  /api/v1/medical-records/:id/versions/:versionNo  单版本详情，404
 *
 * 状态机：draft → submitted → locked（终态不可改，新建版本被 409 拦截）。
 * 写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500；枚举英文 key、number、ISO8601。
 * 与 M541 /fhir/Patient、M540 /smart-triages 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type VersionStatus = 'draft' | 'submitted' | 'locked';

interface RecordVersion {
  versionNo: number;
  content: string;
  editorId: string;
  editorName: string;
  editedAt: string;
  changeReason: string;
  status: VersionStatus;
}

interface MedicalRecord {
  recordId: string;
  versions: RecordVersion[];
  currentVersionNo: number;
}

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const mrStore = new Map<string, MedicalRecord>();

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  mrStore.set('MR-001', {
    recordId: 'MR-001',
    currentVersionNo: 3,
    versions: [
      {
        versionNo: 1, content: '主诉：反复头晕 1 周。初步诊断：高血压待查。',
        editorId: 'E-001', editorName: '陈医师', editedAt: iso(480), changeReason: '初稿', status: 'draft',
      },
      {
        versionNo: 2, content: '主诉：反复头晕 1 周。补充：血压 165/102 mmHg。诊断：原发性高血压 2 级。',
        editorId: 'E-002', editorName: '王医师', editedAt: iso(240), changeReason: '补充查体与诊断', status: 'submitted',
      },
      {
        versionNo: 3, content: '主诉：反复头晕 1 周。查体：BP 165/102，心肺（-）。诊断：原发性高血压 2 级。处理：氨氯地平 5mg qd。',
        editorId: 'E-003', editorName: '李主任', editedAt: iso(60), changeReason: '主任审签定稿', status: 'locked',
      },
    ],
  });
}
seedRecords();

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

// ============================== 1. GET /api/v1/medical-records/:id/versions 列表 ==============================

async function handleVersionList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const recordId = (c.params.id ?? '').trim();
  const rec = mrStore.get(recordId);
  if (!rec) return notFound('MedicalRecord', recordId);
  const versions = rec.versions.slice().sort((a, b) => b.versionNo - a.versionNo);
  return json(ok({ recordId: rec.recordId, currentVersionNo: rec.currentVersionNo, versions }), 200);
}

// ============================== 2. POST /api/v1/medical-records/:id/versions 新建 ==============================

async function handleVersionCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const recordId = (c.params.id ?? '').trim();
  const rec = mrStore.get(recordId);
  if (!rec) return notFound('MedicalRecord', recordId);

  // 状态机：终态 locked 不可新建版本
  const latest = rec.versions.reduce((a, b) => (a.versionNo > b.versionNo ? a : b));
  if (latest.status === 'locked') {
    return json({ code: 409, message: 'record locked, cannot create new version' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const content = body.content;
  const changeReason = body.changeReason;
  const editorId = body.editorId;
  const editorName = body.editorName;

  if (
    typeof content !== 'string' || !content.trim() ||
    typeof changeReason !== 'string' || !changeReason.trim() ||
    typeof editorId !== 'string' || !editorId.trim() ||
    (editorName != null && typeof editorName !== 'string')
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const newVersion: RecordVersion = {
    versionNo: rec.currentVersionNo + 1,
    content: content.trim(),
    editorId: editorId.trim(),
    editorName: typeof editorName === 'string' ? editorName.trim() : editorId.trim(),
    editedAt: new Date().toISOString(),
    changeReason: changeReason.trim(),
    status: 'draft',
  };
  rec.versions.push(newVersion);
  rec.currentVersionNo = newVersion.versionNo;
  return json(ok(newVersion, 'ok'), 200);
}

// ============================== 3. GET /api/v1/medical-records/:id/versions/:versionNo 详情 ==============================

async function handleVersionGet(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const recordId = (c.params.id ?? '').trim();
  const versionNo = Number(c.params.versionNo);
  const rec = mrStore.get(recordId);
  if (!rec) return notFound('MedicalRecord', recordId);
  if (!Number.isInteger(versionNo) || versionNo <= 0) {
    return notFound('RecordVersion', `${recordId}/v${c.params.versionNo}`);
  }
  const v = rec.versions.find((x) => x.versionNo === versionNo);
  if (!v) return notFound('RecordVersion', `${recordId}/v${versionNo}`);
  return json(ok({ recordId: rec.recordId, currentVersionNo: rec.currentVersionNo, version: v }), 200);
}

export const m542Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/medical-records/:id/versions', handle: handleVersionList, auth: true },
  { method: 'POST', path: '/api/v1/medical-records/:id/versions', handle: handleVersionCreate, auth: true },
  { method: 'GET', path: '/api/v1/medical-records/:id/versions/:versionNo', handle: handleVersionGet, auth: true },
];
