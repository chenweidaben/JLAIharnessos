/**
 * 健澜科技 jlmedaios - STOP-BANG 筛查 repo（M59-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface StopBangScreening {
  id: string;
  visitId: string;
  sSnoring: boolean;
  tTired: boolean;
  oObserved: boolean;
  pPressure: boolean;
  bBmi: boolean;
  aAge: boolean;
  nNeck: boolean;
  gGender: boolean;
  score: number;
  riskLevel: string;
  assessor: string;
  createdAt: string;
}

const COLS = `id, visit_id, s_snoring, t_tired, o_observed, p_pressure, b_bmi, a_age,
  n_neck, g_gender, score, risk_level, assessor, created_at`;

function map(r: Record<string, unknown>): StopBangScreening {
  return {
    id: String(r.id),
    visitId: String(r.visit_id),
    sSnoring: Boolean(r.s_snoring),
    tTired: Boolean(r.t_tired),
    oObserved: Boolean(r.o_observed),
    pPressure: Boolean(r.p_pressure),
    bBmi: Boolean(r.b_bmi),
    aAge: Boolean(r.a_age),
    nNeck: Boolean(r.n_neck),
    gGender: Boolean(r.g_gender),
    score: Number(r.score),
    riskLevel: String(r.risk_level),
    assessor: String(r.assessor),
    createdAt: String(r.created_at),
  };
}

export async function createScreening(
  input: {
    visitId: string; sSnoring: boolean; tTired: boolean; oObserved: boolean; pPressure: boolean;
    bBmi: boolean; aAge: boolean; nNeck: boolean; gGender: boolean;
    score: number; riskLevel: string; assessor: string;
  },
  tx: DbExecutor = getDb(),
): Promise<StopBangScreening> {
  const rows = await tx`
    INSERT INTO clinical.stopbang_screenings
      (visit_id, s_snoring, t_tired, o_observed, p_pressure, b_bmi, a_age, n_neck, g_gender,
       score, risk_level, assessor)
    VALUES
      (${input.visitId}, ${input.sSnoring}, ${input.tTired}, ${input.oObserved}, ${input.pPressure},
       ${input.bBmi}, ${input.aAge}, ${input.nNeck}, ${input.gGender},
       ${input.score}, ${input.riskLevel}, ${input.assessor})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

export async function getLatestByVisit(visitId: string, tx: DbExecutor = getDb()): Promise<StopBangScreening | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.stopbang_screenings
    WHERE visit_id=${visitId} ORDER BY created_at DESC, id DESC LIMIT 1`;
  return rows.length === 0 ? null : map(rows[0] as Record<string, unknown>);
}

export async function listByVisit(visitId: string, tx: DbExecutor = getDb()): Promise<StopBangScreening[]> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.stopbang_screenings
    WHERE visit_id=${visitId} ORDER BY created_at DESC, id DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}
