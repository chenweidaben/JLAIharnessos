/**
 * 健澜科技 jlmedaios - 手术安全核查表 repo
 * 读写 surgery.safety_checklist（四阶段 jsonb 核查项 + 三方签名）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { toJson } from './helpers.js';

export type SafetyChecklistPhase = 'pre_op' | 'anesthesia' | 'pre_incision' | 'post_op';

export interface SafetyChecklistItem {
  key: string;
  label: string;
  required: boolean;
  checked: boolean;
}

export interface SafetyChecklistRow {
  id: string;
  surgeryId: string;
  phase: SafetyChecklistPhase;
  items: SafetyChecklistItem[];
  signedBy: string | null;
  signedAt: string | null;
}

const COLS = `id, surgery_id, phase, items, signed_by, signed_at`;

function asItems(raw: unknown): SafetyChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => ({
    key: String(r.key ?? ''),
    label: String(r.label ?? ''),
    required: Boolean(r.required),
    checked: Boolean(r.checked),
  }));
}

function mapRow(r: Record<string, unknown>): SafetyChecklistRow {
  return {
    id: String(r.id),
    surgeryId: String(r.surgery_id),
    phase: String(r.phase) as SafetyChecklistPhase,
    items: asItems(r.items),
    signedBy: r.signed_by == null ? null : String(r.signed_by),
    signedAt: r.signed_at == null ? null : new Date(r.signed_at as string | Date).toISOString(),
  };
}

/** 按手术取出全部四阶段记录。 */
export async function listBySurgery(surgeryId: string): Promise<SafetyChecklistRow[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM surgery.safety_checklist
    WHERE surgery_id=${surgeryId}
    ORDER BY CASE phase
      WHEN 'pre_op' THEN 1
      WHEN 'anesthesia' THEN 2
      WHEN 'pre_incision' THEN 3
      WHEN 'post_op' THEN 4
    END`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export interface SignInput {
  surgeryId: string;
  phase: SafetyChecklistPhase;
  items: SafetyChecklistItem[];
  signedBy: string;
}

/** 签署（或重签）某一阶段：按 (surgery_id, phase) 幂等 upsert，落签名人与时间。 */
export async function upsertSigned(input: SignInput): Promise<SafetyChecklistRow> {
  const db = getDb();
  const rows = await db`
    INSERT INTO surgery.safety_checklist (surgery_id, phase, items, signed_by, signed_at)
    VALUES (${input.surgeryId}, ${input.phase}, ${toJson(input.items)}, ${input.signedBy}, now())
    ON CONFLICT (surgery_id, phase) DO UPDATE SET
      items = EXCLUDED.items,
      signed_by = EXCLUDED.signed_by,
      signed_at = now()
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}
