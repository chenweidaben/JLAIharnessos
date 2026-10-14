/**
 * 健澜科技 jlmedaios - 护士交接班记录 Repository（214）
 *
 * nursing.nurse_handoff 读写。
 * 交班本/接班本模板化：按病区列本班次交接记录，登记时写入自动生成的摘要文本。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export type HandoffShift = 'day' | 'evening' | 'night';

export interface NurseHandoff {
  id: string;
  wardId: string | null;
  shift: HandoffShift;
  patientId: string | null;
  summary: string;
  createdBy: string | null;
  createdAt: string;
}

export interface NewNurseHandoff {
  wardId?: string | null;
  shift: HandoffShift;
  patientId?: string | null;
  summary: string;
  createdBy: string;
}

const COLS = `id, ward_id, shift, patient_id, summary, created_by, created_at`;

function map(row: Record<string, unknown>): NurseHandoff {
  return {
    id: String(row.id),
    wardId: row.ward_id ? String(row.ward_id) : null,
    shift: row.shift as HandoffShift,
    patientId: row.patient_id ? String(row.patient_id) : null,
    summary: String(row.summary ?? ''),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
  };
}

/** 登记一条交班记录。 */
export async function createHandoff(input: NewNurseHandoff, db?: DbExecutor): Promise<NurseHandoff> {
  const exec = db ?? getDb();
  const rows = await exec`
    INSERT INTO nursing.nurse_handoff (ward_id, shift, patient_id, summary, created_by)
    VALUES (${input.wardId ?? null}, ${input.shift}, ${input.patientId ?? null},
      ${input.summary}, ${input.createdBy})
    RETURNING ${exec.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

/** 按病区列交班记录（时间倒序）；wardId 为空时返回全量最近记录。 */
export async function listHandoffsByWard(
  wardId?: string | null, db?: DbExecutor,
): Promise<NurseHandoff[]> {
  const exec = db ?? getDb();
  const rows = wardId
    ? await exec`
        SELECT ${exec.unsafe(COLS)} FROM nursing.nurse_handoff
        WHERE ward_id = ${wardId} ORDER BY created_at DESC LIMIT 200`
    : await exec`
        SELECT ${exec.unsafe(COLS)} FROM nursing.nurse_handoff
        ORDER BY created_at DESC LIMIT 200`;
  return (rows as Record<string, unknown>[]).map(map);
}
