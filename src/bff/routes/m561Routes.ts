/**
 * 健澜科技 jlmedaios - M561 新标准 P4：出院计划闭环（仅新增 approve 状态机端点）
 *
 * 说明：GET /api/v1/discharge-plans、POST /api/v1/discharge-plans、POST /:id/push
 * 已由既有 dischargePlan.ts（DB 后端 + 权限）注册在线，本路由文件**不重复注册**，
 * 仅补充真正缺失的审批执行端点：
 *
 * POST /api/v1/discharge-plans/:id/approve   审批执行（draft→executed；已审批/执行→409 already_approved）
 *
 * 种子 8 条（内存态，仅用于 approve 状态机演示）：2 draft + 4 approved + 2 executed。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type DpStatus = 'draft' | 'approved' | 'executed';

interface DpRecord {
  id: string;
  patientId: string;
  expectedDischargeDate: string;
  dischargeDiagnosis: string;
  followUpDeptCode: string;
  followUpDate: string;
  homeCareNeeds: string[];
  medicationPlan: string;
  patientEducationDone: boolean;
  status: DpStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const dpStore = new Map<string, DpRecord>();
let dpSeq = 0;

function addDp(r: Omit<DpRecord, 'id'>): DpRecord {
  dpSeq += 1;
  const rec: DpRecord = { ...r, id: `DP-${String(dpSeq).padStart(3, '0')}` };
  dpStore.set(rec.id, rec);
  return rec;
}

function seedDp(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 2 条 draft 未审批
  addDp({ patientId: 'P-D001', expectedDischargeDate: '2026-10-25T00:00:00Z', dischargeDiagnosis: '肺炎', followUpDeptCode: 'internal', followUpDate: '2026-11-01T00:00:00Z', homeCareNeeds: ['氧疗', '呼吸训练'], medicationPlan: '左氧氟沙星 0.5g qd', patientEducationDone: true, status: 'draft', approvedBy: null, approvedAt: null, createdAt: iso(60 * 8) });
  addDp({ patientId: 'P-D002', expectedDischargeDate: '2026-10-26T00:00:00Z', dischargeDiagnosis: '糖尿病', followUpDeptCode: 'endocrinology', followUpDate: '2026-11-03T00:00:00Z', homeCareNeeds: ['胰岛素注射指导', '血糖监测'], medicationPlan: '门冬胰岛素 30R 早 12U 晚 8U', patientEducationDone: false, status: 'draft', approvedBy: null, approvedAt: null, createdAt: iso(60 * 4) });

  // 4 条 approved（已审批未执行）
  addDp({ patientId: 'P-D003', expectedDischargeDate: '2026-10-23T00:00:00Z', dischargeDiagnosis: '冠心病', followUpDeptCode: 'cardiology', followUpDate: '2026-10-30T00:00:00Z', homeCareNeeds: ['心脏康复'], medicationPlan: '阿司匹林 100mg qd', patientEducationDone: true, status: 'approved', approvedBy: 'ATTENDING-001', approvedAt: iso(60 * 12), createdAt: iso(60 * 24) });
  addDp({ patientId: 'P-D004', expectedDischargeDate: '2026-10-23T00:00:00Z', dischargeDiagnosis: '脑梗死后遗症', followUpDeptCode: 'neurology', followUpDate: '2026-11-05T00:00:00Z', homeCareNeeds: ['康复训练', '防跌倒'], medicationPlan: '阿司匹林+他汀', patientEducationDone: true, status: 'approved', approvedBy: 'ATTENDING-002', approvedAt: iso(60 * 10), createdAt: iso(60 * 20) });
  addDp({ patientId: 'P-D005', expectedDischargeDate: '2026-10-24T00:00:00Z', dischargeDiagnosis: '慢阻肺急性加重', followUpDeptCode: 'pulmonology', followUpDate: '2026-11-02T00:00:00Z', homeCareNeeds: ['吸入剂使用', '家庭氧疗'], medicationPlan: '布地奈德福莫特罗 1吸 bid', patientEducationDone: true, status: 'approved', approvedBy: 'ATTENDING-003', approvedAt: iso(60 * 8), createdAt: iso(60 * 16) });
  addDp({ patientId: 'P-D006', expectedDischargeDate: '2026-10-24T00:00:00Z', dischargeDiagnosis: '股骨颈骨折术后', followUpDeptCode: 'orthopedics', followUpDate: '2026-11-08T00:00:00Z', homeCareNeeds: ['助行器使用', '防血栓'], medicationPlan: '利伐沙班 10mg qd', patientEducationDone: false, status: 'approved', approvedBy: 'ATTENDING-004', approvedAt: iso(60 * 6), createdAt: iso(60 * 12) });

  // 2 条 executed
  addDp({ patientId: 'P-D007', expectedDischargeDate: '2026-10-20T00:00:00Z', dischargeDiagnosis: '急性阑尾炎术后', followUpDeptCode: 'surgery', followUpDate: '2026-10-27T00:00:00Z', homeCareNeeds: ['切口换药'], medicationPlan: '头孢呋辛 0.5g bid 5天', patientEducationDone: true, status: 'executed', approvedBy: 'ATTENDING-001', approvedAt: iso(60 * 24 * 2), createdAt: iso(60 * 24 * 3) });
  addDp({ patientId: 'P-D008', expectedDischargeDate: '2026-10-21T00:00:00Z', dischargeDiagnosis: '带状疱疹', followUpDeptCode: 'dermatology', followUpDate: '2026-10-28T00:00:00Z', homeCareNeeds: ['神经痛管理'], medicationPlan: '加巴喷丁 0.3g tid', patientEducationDone: true, status: 'executed', approvedBy: 'ATTENDING-005', approvedAt: iso(60 * 24), createdAt: iso(60 * 48) });
}
seedDp();

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

// ============================== POST /api/v1/discharge-plans/:id/approve ==============================

async function handleDpApprove(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = dpStore.get(id);
  if (!rec) return notFound('DischargePlan', id);

  if (rec.status !== 'draft') {
    return json({ code: 409, message: 'already_approved' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const approvedBy = body.approvedBy;
  if (typeof approvedBy !== 'string' || !approvedBy.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.approvedBy = approvedBy.trim();
  rec.approvedAt = new Date().toISOString();
  // 单次 approve 调用直接置 executed（审批后执行完毕）
  rec.status = 'executed';
  return json(ok(rec), 200);
}

export const m561Routes: RouteDef[] = [
  // GET / POST / POST :id/push 已由既有 dischargePlan.ts 注册（DB 后端 + 权限），本文件仅注册 approve 状态机
  { method: 'POST', path: '/api/v1/discharge-plans/:id/approve', handle: handleDpApprove, auth: true },
];
