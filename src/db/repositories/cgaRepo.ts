/**
 * 健澜科技 jlmedaios - 老年综合评估 CGA repo（M56-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';
import type { CgaRiskLevel } from '../../medical-tools/nursing/cga.js';

export interface CgaAssessment {
  id: string;
  visitId: string;
  adlScore: number;
  iadlScore: number;
  mmseScore: number;
  fallRisk: boolean;
  mnaScore: number;
  gdsScore: number;
  riskLevel: CgaRiskLevel;
  assessor: string;
  createdAt: string;
}

const COLS = `id, visit_id, adl_score, iadl_score, mmse_score, fall_risk,
  mna_score, gds_score, risk_level, assessor, created_at`;

function map(r: Record<string, unknown>): CgaAssessment {
  return {
    id: String(r.id),
    visitId: String(r.visit_id),
    adlScore: Number(r.adl_score),
    iadlScore: Number(r.iadl_score),
    mmseScore: Number(r.mmse_score),
    fallRisk: Boolean(r.fall_risk),
    mnaScore: Number(r.mna_score),
    gdsScore: Number(r.gds_score),
    riskLevel: String(r.risk_level) as CgaRiskLevel,
    assessor: String(r.assessor),
    createdAt: String(r.created_at),
  };
}

export async function createAssessment(
  input: {
    visitId: string; adlScore: number; iadlScore: number; mmseScore: number;
    fallRisk: boolean; mnaScore: number; gdsScore: number; riskLevel: CgaRiskLevel; assessor: string;
  },
  tx: DbExecutor = getDb(),
): Promise<CgaAssessment> {
  const rows = await tx`
    INSERT INTO clinical.cga_assessments
      (visit_id, adl_score, iadl_score, mmse_score, fall_risk, mna_score, gds_score, risk_level, assessor)
    VALUES
      (${input.visitId}, ${input.adlScore}, ${input.iadlScore}, ${input.mmseScore},
       ${input.fallRisk}, ${input.mnaScore}, ${input.gdsScore}, ${input.riskLevel}, ${input.assessor})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

export async function listByVisit(visitId: string, tx: DbExecutor = getDb()): Promise<CgaAssessment[]> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.cga_assessments
    WHERE visit_id=${visitId} ORDER BY created_at DESC, id DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}

export async function getLatestByVisit(visitId: string, tx: DbExecutor = getDb()): Promise<CgaAssessment | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.cga_assessments
    WHERE visit_id=${visitId} ORDER BY created_at DESC, id DESC LIMIT 1`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}
