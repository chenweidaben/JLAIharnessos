/**
 * 健澜科技 jlmedaios - M555 新标准 P3：输血反应调查结案（仅新增 investigate 端点）
 *
 * 说明：GET /api/v1/transfusion-reactions 与 POST /api/v1/transfusion-reactions
 * 已由既有 transfusionReaction.ts（DB 后端）注册在线，本路由文件**不重复注册**同路径，
 * 仅补充真正缺失的调查结案端点：
 *
 * POST /api/v1/transfusion-reactions/:id/investigate   调查结案（reported→investigated；重复→409 already_investigated）
 *
 * 种子 6 条（内存态，仅用于 investigate 状态机演示）：2 未调查（reported）+ 4 已调查（investigated）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type ReactionType = 'febrile' | 'allergic' | 'hemolytic' | 'TACO' | 'TRALI' | 'sepsis';
type Severity = 'mild' | 'moderate' | 'severe';
type TxnStatus = 'reported' | 'investigated';

interface TxnRecord {
  id: string;
  transfusionOrderId: string;
  bloodType: string;
  reactionType: ReactionType;
  onsetMinutes: number;
  severity: Severity;
  description: string;
  status: TxnStatus;
  investigationResult: string | null;
  contributingFactors: string | null;
  disposition: string | null;
  investigatedBy: string | null;
  investigatedAt: string | null;
  reportedAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const txnStore = new Map<string, TxnRecord>();
let txnSeq = 0;

function addTxn(r: Omit<TxnRecord, 'id'>): TxnRecord {
  txnSeq += 1;
  const rec: TxnRecord = { ...r, id: `TXN-${String(txnSeq).padStart(3, '0')}` };
  txnStore.set(rec.id, rec);
  return rec;
}

function seedTxn(): void {
  const now = Date.now();
  const isoRep = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 4 条已调查（investigated）
  addTxn({ transfusionOrderId: 'TR-2026-0001', bloodType: 'A Rh+', reactionType: 'febrile', onsetMinutes: 30, severity: 'mild', description: '输注红细胞 30min 后发热 38.5℃', status: 'investigated', investigationResult: '非溶血性发热反应', contributingFactors: '白细胞抗体', disposition: '减速输注+退热', investigatedBy: 'BLOOD-DIRECTOR', investigatedAt: isoRep(60 * 24), reportedAt: isoRep(60 * 72) });
  addTxn({ transfusionOrderId: 'TR-2026-0002', bloodType: 'O Rh+', reactionType: 'allergic', onsetMinutes: 15, severity: 'moderate', description: '输注血小板后荨麻疹伴瘙痒', status: 'investigated', investigationResult: '轻度过敏反应', contributingFactors: '血浆蛋白过敏', disposition: '抗组胺药处理', investigatedBy: 'BLOOD-DIRECTOR', investigatedAt: isoRep(60 * 18), reportedAt: isoRep(60 * 36) });
  addTxn({ transfusionOrderId: 'TR-2026-0003', bloodType: 'B Rh-', reactionType: 'TACO', onsetMinutes: 60, severity: 'severe', description: '输血后呼吸困难、端坐呼吸', status: 'investigated', investigationResult: '循环超负荷 TACO', contributingFactors: '老年心功能不全+输注速度偏快', disposition: '停止输血+利尿+半卧位', investigatedBy: 'BLOOD-DIRECTOR', investigatedAt: isoRep(60 * 12), reportedAt: isoRep(60 * 24) });
  addTxn({ transfusionOrderId: 'TR-2026-0004', bloodType: 'AB Rh+', reactionType: 'sepsis', onsetMinutes: 90, severity: 'severe', description: '输血后寒战高热血压下降', status: 'investigated', investigationResult: '细菌污染败血症', contributingFactors: '血袋无菌操作问题', disposition: '停止输血+广谱抗生素+血袋封存', investigatedBy: 'BLOOD-DIRECTOR', investigatedAt: isoRep(60 * 6), reportedAt: isoRep(60 * 12) });

  // 2 条未调查（reported）
  addTxn({ transfusionOrderId: 'TR-2026-0005', bloodType: 'A Rh+', reactionType: 'hemolytic', onsetMinutes: 5, severity: 'severe', description: '输血 5min 后腰痛、酱油色尿', status: 'reported', investigationResult: null, contributingFactors: null, disposition: null, investigatedBy: null, investigatedAt: null, reportedAt: isoRep(60 * 4) });
  addTxn({ transfusionOrderId: 'TR-2026-0006', bloodType: 'O Rh-', reactionType: 'TRALI', onsetMinutes: 120, severity: 'severe', description: '输血后急性非心源性肺水肿', status: 'reported', investigationResult: null, contributingFactors: null, disposition: null, investigatedBy: null, investigatedAt: null, reportedAt: isoRep(30) });
}
seedTxn();

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

// ============================== POST /api/v1/transfusion-reactions/:id/investigate ==============================

async function handleTxnInvestigate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = txnStore.get(id);
  if (!rec) return notFound('TransfusionReaction', id);

  if (rec.status === 'investigated') {
    return json({ code: 409, message: 'already_investigated' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const investigationResult = body.investigationResult;
  const contributingFactors = body.contributingFactors;
  const disposition = body.disposition;
  const investigatedBy = body.investigatedBy;

  if (
    typeof investigationResult !== 'string' || !investigationResult.trim() ||
    typeof contributingFactors !== 'string' || !contributingFactors.trim() ||
    typeof disposition !== 'string' || !disposition.trim() ||
    typeof investigatedBy !== 'string' || !investigatedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.investigationResult = investigationResult.trim();
  rec.contributingFactors = contributingFactors.trim();
  rec.disposition = disposition.trim();
  rec.investigatedBy = investigatedBy.trim();
  rec.investigatedAt = new Date().toISOString();
  rec.status = 'investigated';
  return json(ok(rec), 200);
}

export const m555Routes: RouteDef[] = [
  // GET / POST 已由既有 transfusionReaction.ts 注册（DB 后端），本文件仅注册 investigate
  { method: 'POST', path: '/api/v1/transfusion-reactions/:id/investigate', handle: handleTxnInvestigate, auth: true },
];
