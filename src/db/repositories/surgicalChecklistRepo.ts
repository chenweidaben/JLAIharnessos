/**
 * 健澜科技 jlmedaios - 手术核查表 repo（M82-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface SurgicalChecklist {
  id: string;
  surgeryId: string;
  signinComplete: boolean;
  timeoutComplete: boolean;
  signoutComplete: boolean;
  patientConfirmed: boolean;
  siteMarked: boolean;
  procedureConfirmed: boolean;
  allergyConfirmed: boolean;
  antibioticGiven: boolean;
  bloodPrepared: boolean;
  instrumentsCounted: boolean;
  status: string;
  createdAt: string;
}

const COLS = `id, surgery_id, signin_complete, timeout_complete, signout_complete,
  patient_confirmed, site_marked, procedure_confirmed, allergy_confirmed,
  antibiotic_given, blood_prepared, instruments_counted, status, created_at`;

function mapRow(r: Record<string, unknown>): SurgicalChecklist {
  return {
    id: String(r.id),
    surgeryId: String(r.surgery_id),
    signinComplete: Boolean(r.signin_complete),
    timeoutComplete: Boolean(r.timeout_complete),
    signoutComplete: Boolean(r.signout_complete),
    patientConfirmed: Boolean(r.patient_confirmed),
    siteMarked: Boolean(r.site_marked),
    procedureConfirmed: Boolean(r.procedure_confirmed),
    allergyConfirmed: Boolean(r.allergy_confirmed),
    antibioticGiven: Boolean(r.antibiotic_given),
    bloodPrepared: Boolean(r.blood_prepared),
    instrumentsCounted: Boolean(r.instruments_counted),
    status: String(r.status),
    createdAt: new Date(r.created_at as string | Date).toISOString(),
  };
}

export async function createChecklist(surgeryId: string): Promise<SurgicalChecklist> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.surgical_checklists (surgery_id)
    VALUES (${surgeryId})
    ON CONFLICT (surgery_id) DO UPDATE SET surgery_id = EXCLUDED.surgery_id
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export type Stage = 'signin' | 'timeout' | 'signout';

export interface StageInput {
  patientConfirmed?: boolean;
  siteMarked?: boolean;
  procedureConfirmed?: boolean;
  allergyConfirmed?: boolean;
  antibioticGiven?: boolean;
  bloodPrepared?: boolean;
  instrumentsCounted?: boolean;
}

export async function updateStage(id: string, stage: Stage, input: StageInput, status: string): Promise<SurgicalChecklist> {
  const db = getDb();
  const col = stage === 'signin' ? 'signin_complete' : stage === 'timeout' ? 'timeout_complete' : 'signout_complete';
  const rows = await db`
    UPDATE clinical.surgical_checklists SET
      ${db.unsafe(col)} = true,
      patient_confirmed = COALESCE(${input.patientConfirmed}, patient_confirmed),
      site_marked = COALESCE(${input.siteMarked}, site_marked),
      procedure_confirmed = COALESCE(${input.procedureConfirmed}, procedure_confirmed),
      allergy_confirmed = COALESCE(${input.allergyConfirmed}, allergy_confirmed),
      antibiotic_given = COALESCE(${input.antibioticGiven}, antibiotic_given),
      blood_prepared = COALESCE(${input.bloodPrepared}, blood_prepared),
      instruments_counted = COALESCE(${input.instrumentsCounted}, instruments_counted),
      status = ${status}
    WHERE id=${id}
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getBySurgery(surgeryId: string): Promise<SurgicalChecklist | null> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.surgical_checklists
    WHERE surgery_id=${surgeryId} LIMIT 1`;
  return rows.length ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function getById(id: string): Promise<SurgicalChecklist | null> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.surgical_checklists
    WHERE id=${id} LIMIT 1`;
  return rows.length ? mapRow(rows[0] as Record<string, unknown>) : null;
}
