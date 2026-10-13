/**
 * 健澜科技 jlmedaios - SBAR 交接 repo（M73-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface SbarHandoff {
  id: string;
  visitId: string;
  fromUnit: string;
  toUnit: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  status: string;
  receiverUuid: string | null;
  receivedAt: string | null;
  handoffBy: string;
  createdAt: string;
}

const COLS = `id, visit_id, from_unit, to_unit, s_situation, b_background, a_assessment, r_recommendation,
  status, receiver_uuid, received_at, handoff_by, created_at`;

function mapRow(r: Record<string, unknown>): SbarHandoff {
  return {
    id: String(r.id),
    visitId: String(r.visit_id),
    fromUnit: String(r.from_unit),
    toUnit: String(r.to_unit),
    situation: String(r.s_situation),
    background: String(r.b_background),
    assessment: String(r.a_assessment),
    recommendation: String(r.r_recommendation),
    status: String(r.status),
    receiverUuid: r.receiver_uuid == null ? null : String(r.receiver_uuid),
    receivedAt: r.received_at == null ? null : String(r.received_at),
    handoffBy: String(r.handoff_by),
    createdAt: String(r.created_at),
  };
}

export interface CreateInput {
  visitId: string;
  fromUnit: string;
  toUnit: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  handoffBy: string;
}

export async function createHandoff(input: CreateInput): Promise<SbarHandoff> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.sbar_handoffs
      (visit_id, from_unit, to_unit, s_situation, b_background, a_assessment, r_recommendation, handoff_by)
    VALUES (${input.visitId}, ${input.fromUnit}, ${input.toUnit}, ${input.situation}, ${input.background},
      ${input.assessment}, ${input.recommendation}, ${input.handoffBy})
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function receiveHandoff(id: string, receiverUuid: string): Promise<SbarHandoff> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.sbar_handoffs
    SET status='received', receiver_uuid=${receiverUuid}, received_at=now()
    WHERE id=${id} AND status='pending'
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function closeHandoff(id: string): Promise<SbarHandoff> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.sbar_handoffs SET status='closed'
    WHERE id=${id} AND status='received'
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function listByVisit(visitId: string): Promise<SbarHandoff[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.sbar_handoffs
    WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}
