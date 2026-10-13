/**
 * 健澜科技 jlmedaios - PICC 维护 repo（M68-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface PiccMaintenance {
  id: string;
  patientId: string;
  deviceType: string;
  insertedAt: string;
  lastMaintainedAt: string;
  dressingChanged: boolean;
  flushed: boolean;
  complication: string | null;
  notes: string | null;
  nurse: string;
  createdAt: string;
}

const COLS = `id, patient_id, device_type, inserted_at, last_maintained_at, dressing_changed, flushed, complication, notes, nurse, created_at`;

function mapRow(r: Record<string, unknown>): PiccMaintenance {
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    deviceType: String(r.device_type),
    insertedAt: String(r.inserted_at),
    lastMaintainedAt: String(r.last_maintained_at),
    dressingChanged: Boolean(r.dressing_changed),
    flushed: Boolean(r.flushed),
    complication: r.complication == null ? null : String(r.complication),
    notes: r.notes == null ? null : String(r.notes),
    nurse: String(r.nurse),
    createdAt: String(r.created_at),
  };
}

export interface RecordInput {
  patientId: string;
  deviceType: string;
  insertedAt: string;
  lastMaintainedAt: string;
  dressingChanged: boolean;
  flushed: boolean;
  complication: string | null;
  notes: string | null;
  nurse: string;
}

export async function recordMaintenance(input: RecordInput): Promise<PiccMaintenance> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.picc_maintenances
      (patient_id, device_type, inserted_at, last_maintained_at, dressing_changed, flushed, complication, notes, nurse)
    VALUES (${input.patientId}, ${input.deviceType}, ${input.insertedAt}, ${input.lastMaintainedAt},
      ${input.dressingChanged}, ${input.flushed}, ${input.complication}, ${input.notes}, ${input.nurse})
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function listByPatient(patientId: string): Promise<PiccMaintenance[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.picc_maintenances
    WHERE patient_id=${patientId} ORDER BY last_maintained_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function getLatest(patientId: string): Promise<PiccMaintenance | null> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.picc_maintenances
    WHERE patient_id=${patientId} ORDER BY last_maintained_at DESC LIMIT 1`;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}
