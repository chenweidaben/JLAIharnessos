/**
 * 健澜科技数智医院智能体 - 处方 Repository
 * clinical.prescriptions + clinical.prescription_items 表 CRUD。
 * 处方头与明细在同一事务中写入，保证一致性。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql, withTx } from '../pool.js';
import { dynamicSelect, QueryBuilder, toJson } from './helpers.js';

export type PrescriptionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'dispensed' | 'cancelled';

export interface PrescriptionItem {
  id?: string; drugCode: string | null; drugName: string; specification: string | null;
  dosage: number | null; dosageUnit: string | null; frequency: string | null;
  route: string | null; daysSupply: number | null; quantity: number | null;
  quantityUnit: string | null; skinTest: boolean; remark: string | null;
}

export interface Prescription {
  id: string; visitId: string; rxNo: string; prescriberId: string | null;
  status: PrescriptionStatus; reviewerId: string | null; reviewLevel: string | null;
  riskLevel: string | null; auditResult: Record<string, unknown>; counsel: string | null;
  totalFee: number | null; items: PrescriptionItem[]; createdAt: string; updatedAt: string;
}

export interface PrescriptionCreateInput {
  visitId: string; prescriberId?: string | null; items: PrescriptionItem[]; counsel?: string | null;
}

const RX_COLS = `id, visit_id, rx_no, prescriber_id, status, reviewer_id, review_level, risk_level, audit_result, counsel, total_fee, created_at, updated_at`;
const ITEM_COLS = `id, drug_code, drug_name, specification, dosage, dosage_unit, frequency, route, days_supply, quantity, quantity_unit, skin_test, remark`;

function mapRxRow(row: Record<string, unknown>): Omit<Prescription, 'items'> {
  return {
    id: String(row.id), visitId: String(row.visit_id), rxNo: String(row.rx_no),
    prescriberId: row.prescriber_id ? String(row.prescriber_id) : null,
    status: row.status as PrescriptionStatus,
    reviewerId: row.reviewer_id ? String(row.reviewer_id) : null,
    reviewLevel: row.review_level ? String(row.review_level) : null,
    riskLevel: row.risk_level ? String(row.risk_level) : null,
    auditResult: (row.audit_result as Record<string, unknown>) ?? {},
    counsel: row.counsel ? String(row.counsel) : null,
    totalFee: row.total_fee !== null ? Number(row.total_fee) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function mapItemRow(row: Record<string, unknown>): PrescriptionItem {
  return {
    id: String(row.id), drugCode: row.drug_code ? String(row.drug_code) : null,
    drugName: String(row.drug_name), specification: row.specification ? String(row.specification) : null,
    dosage: row.dosage !== null ? Number(row.dosage) : null,
    dosageUnit: row.dosage_unit ? String(row.dosage_unit) : null,
    frequency: row.frequency ? String(row.frequency) : null,
    route: row.route ? String(row.route) : null,
    daysSupply: row.days_supply !== null ? Number(row.days_supply) : null,
    quantity: row.quantity !== null ? Number(row.quantity) : null,
    quantityUnit: row.quantity_unit ? String(row.quantity_unit) : null,
    skinTest: Boolean(row.skin_test), remark: row.remark ? String(row.remark) : null,
  };
}

function generateRxNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `RX${ymd}${Math.floor(Math.random() * 900000) + 100000}`;
}

export async function createPrescription(input: PrescriptionCreateInput, sql?: Sql): Promise<Prescription> {
  return withTx(async (tx) => {
    const rxRows = await tx`
      INSERT INTO clinical.prescriptions (visit_id, rx_no, prescriber_id, status, counsel)
      VALUES (${input.visitId}, ${generateRxNo()}, ${input.prescriberId ?? null}, 'pending_review', ${input.counsel ?? null})
      RETURNING ${tx(RX_COLS)}
    `;
    const rx = mapRxRow(rxRows[0] as Record<string, unknown>);
    const items: PrescriptionItem[] = [];
    for (const item of input.items) {
      const itemRows = await tx`
        INSERT INTO clinical.prescription_items (prescription_id, drug_code, drug_name, specification, dosage, dosage_unit, frequency, route, days_supply, quantity, quantity_unit, skin_test, remark)
        VALUES (${rx.id}, ${item.drugCode ?? null}, ${item.drugName}, ${item.specification ?? null}, ${item.dosage ?? null}, ${item.dosageUnit ?? null}, ${item.frequency ?? null}, ${item.route ?? null}, ${item.daysSupply ?? null}, ${item.quantity ?? null}, ${item.quantityUnit ?? null}, ${item.skinTest}, ${item.remark ?? null})
        RETURNING ${tx(ITEM_COLS)}
      `;
      items.push(mapItemRow(itemRows[0] as Record<string, unknown>));
    }
    return { ...rx, items };
  });
}

export async function getPrescriptionById(id: string, sql?: Sql): Promise<Prescription | null> {
  const db = sql ?? getDb();
  const rxRows = await db`SELECT ${db(RX_COLS)} FROM clinical.prescriptions WHERE id = ${id}`;
  if (rxRows.length === 0) return null;
  const rx = mapRxRow(rxRows[0] as Record<string, unknown>);
  const itemRows = await db`SELECT ${db(ITEM_COLS)} FROM clinical.prescription_items WHERE prescription_id = ${id} ORDER BY created_at`;
  return { ...rx, items: (itemRows as Record<string, unknown>[]).map(mapItemRow) };
}

export async function getPrescriptionsByVisit(
  visitId: string, options?: { status?: PrescriptionStatus; limit?: number }, sql?: Sql,
): Promise<Prescription[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('visit_id = ?', visitId);
  if (options?.status) qb.where('status = ?', options.status);
  const rxRows = await dynamicSelect<Record<string, unknown>>(db, RX_COLS, 'clinical.prescriptions', qb, 'created_at DESC', options?.limit ?? 50);
  const result: Prescription[] = [];
  for (const row of rxRows) {
    const rx = mapRxRow(row);
    const itemRows = await db`SELECT ${db(ITEM_COLS)} FROM clinical.prescription_items WHERE prescription_id = ${rx.id} ORDER BY created_at`;
    result.push({ ...rx, items: (itemRows as Record<string, unknown>[]).map(mapItemRow) });
  }
  return result;
}

export async function auditPrescription(
  id: string, decision: 'approved' | 'rejected', reviewerId: string,
  auditResult: Record<string, unknown>, sql?: Sql,
): Promise<Prescription | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.prescriptions SET status = ${decision}, reviewer_id = ${reviewerId},
      audit_result = ${db.json(toJson(auditResult))}, updated_at = now()
    WHERE id = ${id} AND status = 'pending_review' RETURNING ${db(RX_COLS)}
  `;
  if (rows.length === 0) return null;
  return getPrescriptionById(id, sql);
}

export async function dispensePrescription(id: string, sql?: Sql): Promise<Prescription | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.prescriptions SET status = 'dispensed', updated_at = now()
    WHERE id = ${id} AND status = 'approved' RETURNING ${db(RX_COLS)}
  `;
  if (rows.length === 0) return null;
  return getPrescriptionById(id, sql);
}
