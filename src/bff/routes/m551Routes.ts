/**
 * 健澜科技 jlmedaios - M551 新标准 P2：手术安全核查闭环 GET+POST
 *
 * GET  /api/v1/surgical-checklists?operationId=   列表（completedAt 倒序；operationId 过滤）
 * POST /api/v1/surgical-checklists                 提交核查（三阶段顺序状态机：signIn→timeOut→signOut）
 *
 * 状态机：
 *   - 该 operationId 下无记录 → 仅允许 signIn
 *   - 已有 signIn → 仅允许 timeOut
 *   - 已有 timeOut → 仅允许 signOut
 *   - 已有 signOut → 409 already_completed
 *   - 跳阶段（如新 operationId 直接 timeOut/signOut）→ 409 phase_out_of_order
 *   - 同阶段重复提交 → 409 phase_duplicate
 *
 * 种子：OP-001、OP-002 各完整三阶段 = 6 条。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Phase = 'signIn' | 'timeOut' | 'signOut';

interface ChecklistItem {
  itemCode: string;
  checked: boolean;
  remark: string | null;
}

interface ChecklistRecord {
  id: string;
  operationId: string;
  phase: Phase;
  completedBy: string;
  completedAt: string;
  checklistItems: ChecklistItem[];
}

const PHASE_ORDER: Phase[] = ['signIn', 'timeOut', 'signOut'];

// ============================== 内存态库（DEMO 短路） ==============================

const chkStore: ChecklistRecord[] = [];
let chkSeq = 0;

function addChk(operationId: string, phase: Phase, completedBy: string, completedAt: string, items: ChecklistItem[]): ChecklistRecord {
  chkSeq += 1;
  const rec: ChecklistRecord = {
    id: `CHK-${String(chkSeq).padStart(3, '0')}`,
    operationId, phase, completedBy, completedAt, checklistItems: items,
  };
  chkStore.push(rec);
  return rec;
}

function seedChk(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const signInItems: ChecklistItem[] = [
    { itemCode: 'patient_identity', checked: true, remark: null },
    { itemCode: 'surgical_site_mark', checked: true, remark: '左侧腹股沟' },
    { itemCode: 'consent_confirmed', checked: true, remark: null },
  ];
  const timeOutItems: ChecklistItem[] = [
    { itemCode: 'antibiotic_prophylaxis', checked: true, remark: '切皮前 30min 头孢呋辛' },
    { itemCode: 'equipment_availability', checked: true, remark: null },
    { itemCode: 'sterility_confirmed', checked: true, remark: null },
  ];
  const signOutItems: ChecklistItem[] = [
    { itemCode: 'instrument_count', checked: true, remark: '纱布/器械数目核对一致' },
    { itemCode: 'specimen_labeled', checked: true, remark: null },
    { itemCode: 'equipment_recovery', checked: true, remark: null },
  ];
  for (const op of ['OP-001', 'OP-002']) {
    addChk(op, 'signIn', 'NURSE-CHIEF', iso(180), signInItems);
    addChk(op, 'timeOut', 'SURGEON-CHIEF', iso(120), timeOutItems);
    addChk(op, 'signOut', 'ANAESTHESIOLOGIST', iso(30), signOutItems);
  }
}
seedChk();

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

// ============================== 1. GET /api/v1/surgical-checklists ==============================

async function handleChkList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const operationId = (c.query.get('operationId') ?? '').trim();
  let rows = chkStore.slice();
  if (operationId) rows = rows.filter((r) => r.operationId === operationId);
  rows = rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/surgical-checklists ==============================

async function handleChkCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const operationId = body.operationId;
  const phase = body.phase;
  const completedBy = body.completedBy;
  const checklistItems = body.checklistItems;

  if (
    typeof operationId !== 'string' || !operationId.trim() ||
    typeof phase !== 'string' || !PHASE_ORDER.includes(phase as Phase) ||
    typeof completedBy !== 'string' || !completedBy.trim() ||
    !Array.isArray(checklistItems)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // 状态机校验
  const opRows = chkStore.filter((r) => r.operationId === operationId);
  const existingPhaseIdxs = PHASE_ORDER.map((p, i) => (opRows.some((r) => r.phase === p) ? i : -1)).filter((i) => i >= 0);
  const maxIdx = existingPhaseIdxs.length ? Math.max(...existingPhaseIdxs) : -1;
  const newIdx = PHASE_ORDER.indexOf(phase as Phase);

  // 已完成 signOut（终态）
  if (maxIdx === PHASE_ORDER.length - 1) {
    return json({ code: 409, message: 'already_completed' }, 409);
  }
  // 同阶段重复
  if (existingPhaseIdxs.includes(newIdx)) {
    return json({ code: 409, message: 'phase_duplicate' }, 409);
  }
  // 跳阶段：新阶段必须恰好是 maxIdx+1
  if (newIdx !== maxIdx + 1) {
    return json({ code: 409, message: 'phase_out_of_order' }, 409);
  }

  const items: ChecklistItem[] = (checklistItems as unknown[]).filter((x): x is ChecklistItem => !!x && typeof x === 'object' && typeof (x as ChecklistItem).itemCode === 'string');

  const rec = addChk(
    operationId.trim(),
    phase as Phase,
    completedBy.trim(),
    new Date().toISOString(),
    items,
  );
  return json(ok(rec), 200);
}

export const m551Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/surgical-checklists', handle: handleChkList, auth: true },
  { method: 'POST', path: '/api/v1/surgical-checklists', handle: handleChkCreate, auth: true },
];
