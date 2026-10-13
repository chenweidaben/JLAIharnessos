/**
 * 健澜科技 jlmedaios - MDT 会诊 repo（M66-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface MdtConsult {
  id: string;
  visitId: string;
  title: string;
  reason: string;
  departments: string[];
  scheduledAt: string | null;
  status: string;
  minutes: string | null;
  conclusion: string | null;
  requestedBy: string;
  createdAt: string;
}

const COLS = `id, visit_id, title, reason, departments, scheduled_at, status, minutes, conclusion, requested_by, created_at`;

function mapRow(r: Record<string, unknown>): MdtConsult {
  return {
    id: String(r.id),
    visitId: String(r.visit_id),
    title: String(r.title),
    reason: String(r.reason),
    departments: (r.departments as string[] | null) ?? [],
    scheduledAt: r.scheduled_at == null ? null : String(r.scheduled_at),
    status: String(r.status),
    minutes: r.minutes == null ? null : String(r.minutes),
    conclusion: r.conclusion == null ? null : String(r.conclusion),
    requestedBy: String(r.requested_by),
    createdAt: String(r.created_at),
  };
}

export interface CreateInput {
  visitId: string;
  title: string;
  reason: string;
  departments: string[];
  requestedBy: string;
}

export async function createConsult(input: CreateInput): Promise<MdtConsult> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.mdt_consults
      (visit_id, title, reason, departments, requested_by)
    VALUES (${input.visitId}, ${input.title}, ${input.reason}, ${input.departments}, ${input.requestedBy})
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function schedule(id: string, scheduledAt: string): Promise<MdtConsult> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.mdt_consults SET scheduled_at=${scheduledAt}, status='scheduled'
    WHERE id=${id} RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function recordMinutes(id: string, minutes: string, conclusion: string): Promise<MdtConsult> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.mdt_consults SET minutes=${minutes}, conclusion=${conclusion}, status='concluded'
    WHERE id=${id} RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function listByVisit(visitId: string): Promise<MdtConsult[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.mdt_consults WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}
