/**
 * 健澜科技 jlmedaios - 急诊留观 repo（M74-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface EdObservation {
  id: string;
  patientId: string;
  triageLevel: string;
  enteredAt: string;
  dischargedAt: string | null;
  disposition: string | null;
  status: string;
  registeredBy: string;
  createdAt: string;
}

const COLS = `id, patient_id, triage_level, entered_at, discharged_at, disposition, status, registered_by, created_at`;

function mapRow(r: Record<string, unknown>): EdObservation {
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    triageLevel: String(r.triage_level),
    enteredAt: new Date(r.entered_at as string | Date).toISOString(),
    dischargedAt: r.discharged_at == null ? null : new Date(r.discharged_at as string | Date).toISOString(),
    disposition: r.disposition == null ? null : String(r.disposition),
    status: String(r.status),
    registeredBy: String(r.registered_by),
    createdAt: new Date(r.created_at as string | Date).toISOString(),
  };
}

export interface RegisterInput {
  patientId: string;
  triageLevel: string;
  registeredBy: string;
}

export async function registerObservation(input: RegisterInput): Promise<EdObservation> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.ed_observations (patient_id, triage_level, registered_by)
    VALUES (${input.patientId}, ${input.triageLevel}, ${input.registeredBy})
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function closeObservation(id: string, disposition: string): Promise<EdObservation> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.ed_observations
    SET status='closed', discharged_at=now(), disposition=${disposition}
    WHERE id=${id} AND status='observing'
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function listActive(): Promise<EdObservation[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.ed_observations
    WHERE status='observing' ORDER BY entered_at ASC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function listByPatient(patientId: string): Promise<EdObservation[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.ed_observations
    WHERE patient_id=${patientId} ORDER BY entered_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}
