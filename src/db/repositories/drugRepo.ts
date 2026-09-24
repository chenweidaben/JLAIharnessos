/**
 * 健澜科技数智医院智能体 - 药品目录 Repository
 * clinical.drug_catalog 表 CRUD。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../pool.js';
import { dynamicSelect, QueryBuilder, toJson } from './helpers.js';

export interface Drug {
  id: string; drugCode: string; genericName: string; brandName: string | null;
  specification: string; dosageForm: string; route: string | null; unit: string;
  price: number | null; manufacturer: string | null; category: string | null;
  pregnancyCat: string | null; controlled: boolean;
  ingredients: Array<Record<string, unknown>>; contraindications: string | null;
  adverseReactions: string | null; interactions: Array<Record<string, unknown>>;
  status: 'active' | 'inactive' | 'deprecated'; createdAt: string; updatedAt: string;
}

const SELECT_COLS = `id, drug_code, generic_name, brand_name, specification, dosage_form, route, unit, price, manufacturer, category, pregnancy_cat, controlled, ingredients, contraindications, adverse_reactions, interactions, status, created_at, updated_at`;

function mapRow(row: Record<string, unknown>): Drug {
  return {
    id: String(row.id), drugCode: String(row.drug_code), genericName: String(row.generic_name),
    brandName: row.brand_name ? String(row.brand_name) : null,
    specification: String(row.specification), dosageForm: String(row.dosage_form),
    route: row.route ? String(row.route) : null, unit: String(row.unit),
    price: row.price !== null ? Number(row.price) : null,
    manufacturer: row.manufacturer ? String(row.manufacturer) : null,
    category: row.category ? String(row.category) : null,
    pregnancyCat: row.pregnancy_cat ? String(row.pregnancy_cat) : null,
    controlled: Boolean(row.controlled),
    ingredients: (row.ingredients as Array<Record<string, unknown>>) ?? [],
    contraindications: row.contraindications ? String(row.contraindications) : null,
    adverseReactions: row.adverse_reactions ? String(row.adverse_reactions) : null,
    interactions: (row.interactions as Array<Record<string, unknown>>) ?? [],
    status: row.status as Drug['status'],
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function getDrugByCode(drugCode: string, sql?: Sql): Promise<Drug | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SELECT_COLS)} FROM clinical.drug_catalog WHERE drug_code = ${drugCode} AND status = 'active'`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function searchDrugs(keyword: string, limit = 20, sql?: Sql): Promise<Drug[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)} FROM clinical.drug_catalog
    WHERE status = 'active' AND (generic_name ILIKE ${'%' + keyword + '%'} OR brand_name ILIKE ${'%' + keyword + '%'} OR drug_code ILIKE ${'%' + keyword + '%'})
    ORDER BY generic_name LIMIT ${limit}
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function listDrugs(limit = 100, offset = 0, sql?: Sql): Promise<Drug[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SELECT_COLS)} FROM clinical.drug_catalog WHERE status = 'active' ORDER BY generic_name LIMIT ${limit} OFFSET ${offset}`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function createDrug(input: Omit<Drug, 'id' | 'createdAt' | 'updatedAt'>, sql?: Sql): Promise<Drug> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.drug_catalog (drug_code, generic_name, brand_name, specification, dosage_form, route, unit, price, manufacturer, category, pregnancy_cat, controlled, ingredients, contraindications, adverse_reactions, interactions, status)
    VALUES (${input.drugCode}, ${input.genericName}, ${input.brandName ?? null}, ${input.specification},
      ${input.dosageForm}, ${input.route ?? null}, ${input.unit}, ${input.price ?? null},
      ${input.manufacturer ?? null}, ${input.category ?? null}, ${input.pregnancyCat ?? null},
      ${input.controlled}, ${db.json(toJson(input.ingredients))}, ${input.contraindications ?? null},
      ${input.adverseReactions ?? null}, ${db.json(toJson(input.interactions))}, ${input.status})
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}
