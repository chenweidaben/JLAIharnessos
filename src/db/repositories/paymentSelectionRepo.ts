/**
 * 健澜科技 jlmedaios - 病组选择 repo（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../pool.js';

const db = getDb();

export interface SelectionRow {
  id: string; visitId: string;
  drgGroupCode: string | null; drgExpectedPayment: number | null;
  dipPacketCode: string | null; dipScore: number | null; dipPointValue: number | null; dipPayment: number | null;
  selectedPath: string; rationale: string | null;
}

function map(r: Record<string, unknown>): SelectionRow {
  return {
    id: String(r.id), visitId: String(r.visit_id),
    drgGroupCode: r.drg_group_code == null ? null : String(r.drg_group_code),
    drgExpectedPayment: r.drg_expected_payment == null ? null : Number(r.drg_expected_payment),
    dipPacketCode: r.dip_packet_code == null ? null : String(r.dip_packet_code),
    dipScore: r.dip_score == null ? null : Number(r.dip_score),
    dipPointValue: r.dip_point_value == null ? null : Number(r.dip_point_value),
    dipPayment: r.dip_payment == null ? null : Number(r.dip_payment),
    selectedPath: String(r.selected_path), rationale: r.rationale == null ? null : String(r.rationale),
  };
}

export async function upsertSelection(input: {
  visitId: string; drgGroupCode?: string | null; drgExpectedPayment?: number | null;
  dipPacketCode?: string | null; dipScore?: number | null; dipPointValue?: number | null; dipPayment?: number | null;
  selectedPath: string; rationale?: string | null;
}): Promise<SelectionRow> {
  const rows = await db`
    INSERT INTO clinical.payment_group_selection (visit_id, drg_group_code, drg_expected_payment, dip_packet_code, dip_score, dip_point_value, dip_payment, selected_path, rationale)
    VALUES (${input.visitId}, ${input.drgGroupCode ?? null}, ${input.drgExpectedPayment ?? null}, ${input.dipPacketCode ?? null}, ${input.dipScore ?? null}, ${input.dipPointValue ?? null}, ${input.dipPayment ?? null}, ${input.selectedPath}, ${input.rationale ?? null})
    ON CONFLICT (visit_id) DO UPDATE SET
      drg_group_code=EXCLUDED.drg_group_code, drg_expected_payment=EXCLUDED.drg_expected_payment,
      dip_packet_code=EXCLUDED.dip_packet_code, dip_score=EXCLUDED.dip_score, dip_point_value=EXCLUDED.dip_point_value, dip_payment=EXCLUDED.dip_payment,
      selected_path=EXCLUDED.selected_path, rationale=EXCLUDED.rationale
    RETURNING id, visit_id, drg_group_code, drg_expected_payment, dip_packet_code, dip_score, dip_point_value, dip_payment, selected_path, rationale`;
  return map(rows[0] as Record<string, unknown>);
}

export async function getByVisit(visitId: string): Promise<SelectionRow | null> {
  const rows = await db`
    SELECT id, visit_id, drg_group_code, drg_expected_payment, dip_packet_code, dip_score, dip_point_value, dip_payment, selected_path, rationale
    FROM clinical.payment_group_selection WHERE visit_id=${visitId}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

export async function listSelections(): Promise<SelectionRow[]> {
  const rows = await db`
    SELECT id, visit_id, drg_group_code, drg_expected_payment, dip_packet_code, dip_score, dip_point_value, dip_payment, selected_path, rationale
    FROM clinical.payment_group_selection ORDER BY created_at DESC`;
  return rows.map((r) => map(r as Record<string, unknown>));
}

export async function overrideSelection(visitId: string, selectedPath: string, overrideBy: string): Promise<SelectionRow> {
  const rows = await db`
    UPDATE clinical.payment_group_selection
    SET selected_path=${selectedPath}, override_by=${overrideBy}, override_at=now()
    WHERE visit_id=${visitId}
    RETURNING id, visit_id, drg_group_code, drg_expected_payment, dip_packet_code, dip_score, dip_point_value, dip_payment, selected_path, rationale`;
  return map(rows[0] as Record<string, unknown>);
}
