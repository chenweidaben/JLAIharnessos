/**
 * 健澜科技 jlmedaios - M557 新标准 P3：药物不良反应 ADR 闭环 3 端点
 *
 * GET  /api/v1/adverse-drug-reactions?drugName=&serious=   列表（reportedAt 倒序；drugName/serious 过滤）
 * POST /api/v1/adverse-drug-reactions                   新建（status='reported'）
 * POST /api/v1/adverse-drug-reactions/:id/assess         因果关系评估（reported→assessed；重复→409 already_assessed）
 *
 * 种子 8 条：1 例 fatal + 1 例 serious=true 非 fatal；其余 recovered/recovering 混合。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Outcome = 'recovered' | 'recovering' | 'not_recovered' | 'fatal';
const OUTCOMES: Outcome[] = ['recovered', 'recovering', 'not_recovered', 'fatal'];

type Causality = 'certain' | 'probable' | 'possible' | 'unlikely';
const CAUSALITIES: Causality[] = ['certain', 'probable', 'possible', 'unlikely'];

type AdrStatus = 'reported' | 'assessed';

interface AdrRecord {
  id: string;
  patientId: string;
  drugName: string;
  drugCode: string;
  reactionDescription: string;
  onsetDays: number;
  serious: boolean;
  outcome: Outcome;
  actionTaken: string;
  status: AdrStatus;
  causality: Causality | null;
  naranjoScore: number | null;
  assessedBy: string | null;
  assessedAt: string | null;
  reportedAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const adrStore = new Map<string, AdrRecord>();
let adrSeq = 0;

function addAdr(r: Omit<AdrRecord, 'id'>): AdrRecord {
  adrSeq += 1;
  const rec: AdrRecord = { ...r, id: `ADR-${String(adrSeq).padStart(3, '0')}` };
  adrStore.set(rec.id, rec);
  return rec;
}

function seedAdr(): void {
  const now = Date.now();
  const isoRep = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 1 例 fatal（serious=true）
  addAdr({ patientId: 'P-A001', drugName: '阿司匹林', drugCode: 'ASPIRIN', reactionDescription: '消化道大出血致失血性休克死亡', onsetDays: 5, serious: true, outcome: 'fatal', actionTaken: '停药+抢救无效', status: 'assessed', causality: 'certain', naranjoScore: 13, assessedBy: 'PHARMACOVIGILANCE-DIRECTOR', assessedAt: isoRep(60 * 72), reportedAt: isoRep(60 * 96) });

  // 1 例 serious=true 非 fatal
  addAdr({ patientId: 'P-A002', drugName: '卡马西平', drugCode: 'CARBAMAZEPINE', reactionDescription: 'Stevens-Johnson 综合征，需住院', onsetDays: 14, serious: true, outcome: 'recovering', actionTaken: '停药+激素+烧伤科治疗', status: 'assessed', causality: 'probable', naranjoScore: 9, assessedBy: 'PHARMACOVIGILANCE-DIRECTOR', assessedAt: isoRep(60 * 48), reportedAt: isoRep(60 * 60) });

  // 其余 6 条 recovered/recovering 混合（含已评估与未评估）
  addAdr({ patientId: 'P-A003', drugName: '阿莫西林', drugCode: 'AMOXICILLIN', reactionDescription: '全身荨麻疹伴瘙痒', onsetDays: 3, serious: false, outcome: 'recovered', actionTaken: '停药+抗组胺药', status: 'assessed', causality: 'probable', naranjoScore: 8, assessedBy: 'PHARMACOVIGILANCE-DIRECTOR', assessedAt: isoRep(60 * 36), reportedAt: isoRep(60 * 48) });
  addAdr({ patientId: 'P-A004', drugName: '阿托伐他汀', drugCode: 'ATORVASTATIN', reactionDescription: '肌痛伴 CK 升高 3 倍上限', onsetDays: 30, serious: false, outcome: 'recovering', actionTaken: '减量+辅酶 Q10', status: 'assessed', causality: 'possible', naranjoScore: 6, assessedBy: 'PHARMACOVIGILANCE-DIRECTOR', assessedAt: isoRep(60 * 24), reportedAt: isoRep(60 * 36) });
  addAdr({ patientId: 'P-A005', drugName: '华法林', drugCode: 'WARFARIN', reactionDescription: '牙龈出血 INR 4.5', onsetDays: 7, serious: false, outcome: 'recovered', actionTaken: '减量+维生素 K', status: 'assessed', causality: 'probable', naranjoScore: 7, assessedBy: 'PHARMACOVIGILANCE-DIRECTOR', assessedAt: isoRep(60 * 12), reportedAt: isoRep(60 * 24) });
  addAdr({ patientId: 'P-A006', drugName: '左氧氟沙星', drugCode: 'LEVOFLOXACIN', reactionDescription: '肌腱疼痛', onsetDays: 10, serious: false, outcome: 'recovering', actionTaken: '停药+制动', status: 'reported', causality: null, naranjoScore: null, assessedBy: null, assessedAt: null, reportedAt: isoRep(60 * 8) });
  addAdr({ patientId: 'P-A007', drugName: '二甲双胍', drugCode: 'METFORMIN', reactionDescription: '胃肠道不适恶心', onsetDays: 2, serious: false, outcome: 'recovered', actionTaken: '餐中服用缓解', status: 'reported', causality: null, naranjoScore: null, assessedBy: null, assessedAt: null, reportedAt: isoRep(60 * 4) });
  addAdr({ patientId: 'P-A008', drugName: '布洛芬', drugCode: 'IBUPROFEN', reactionDescription: '胃部隐痛反酸', onsetDays: 5, serious: false, outcome: 'recovering', actionTaken: 'PPI 护胃', status: 'reported', causality: null, naranjoScore: null, assessedBy: null, assessedAt: null, reportedAt: isoRep(30) });
}
seedAdr();

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

// ============================== 1. GET /api/v1/adverse-drug-reactions ==============================

async function handleAdrList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const drugName = (c.query.get('drugName') ?? '').trim();
  const serious = (c.query.get('serious') ?? '').trim();

  let rows = Array.from(adrStore.values());
  if (drugName) rows = rows.filter((r) => r.drugName.includes(drugName));
  if (serious === 'true') rows = rows.filter((r) => r.serious === true);
  else if (serious === 'false') rows = rows.filter((r) => r.serious === false);
  rows = rows.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/adverse-drug-reactions ==============================

async function handleAdrCreate(c: Ctx): Promise<Response> {
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
  const drugName = body.drugName;
  const drugCode = body.drugCode;
  const reactionDescription = body.reactionDescription;
  const onsetDays = body.onsetDays;
  const serious = body.serious;
  const outcome = body.outcome;
  const actionTaken = body.actionTaken;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof drugName !== 'string' || !drugName.trim() ||
    typeof drugCode !== 'string' || !drugCode.trim() ||
    typeof reactionDescription !== 'string' || !reactionDescription.trim() ||
    typeof onsetDays !== 'number' || !Number.isFinite(onsetDays) || onsetDays < 0 ||
    typeof serious !== 'boolean' ||
    typeof outcome !== 'string' || !OUTCOMES.includes(outcome as Outcome) ||
    typeof actionTaken !== 'string' || !actionTaken.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addAdr({
    patientId: patientId.trim(),
    drugName: drugName.trim(),
    drugCode: drugCode.trim(),
    reactionDescription: reactionDescription.trim(),
    onsetDays,
    serious,
    outcome: outcome as Outcome,
    actionTaken: actionTaken.trim(),
    status: 'reported',
    causality: null,
    naranjoScore: null,
    assessedBy: null,
    assessedAt: null,
    reportedAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/adverse-drug-reactions/:id/assess ==============================

async function handleAdrAssess(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = adrStore.get(id);
  if (!rec) return notFound('AdverseDrugReaction', id);

  if (rec.status === 'assessed') {
    return json({ code: 409, message: 'already_assessed' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const causality = body.causality;
  const naranjoScore = body.naranjoScore;
  const assessedBy = body.assessedBy;

  if (
    typeof causality !== 'string' || !CAUSALITIES.includes(causality as Causality) ||
    typeof naranjoScore !== 'number' || !Number.isFinite(naranjoScore) || naranjoScore < 0 || naranjoScore > 13 ||
    typeof assessedBy !== 'string' || !assessedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.causality = causality as Causality;
  rec.naranjoScore = naranjoScore;
  rec.assessedBy = assessedBy.trim();
  rec.assessedAt = new Date().toISOString();
  rec.status = 'assessed';
  return json(ok(rec), 200);
}

export const m557Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/adverse-drug-reactions', handle: handleAdrList, auth: true },
  { method: 'POST', path: '/api/v1/adverse-drug-reactions', handle: handleAdrCreate, auth: true },
  { method: 'POST', path: '/api/v1/adverse-drug-reactions/:id/assess', handle: handleAdrAssess, auth: true },
];
