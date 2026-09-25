/**
 * 健澜科技 jlmedaios - 院区/病区 Repository
 *
 * clinical.campuses（院区，一院多区）与 clinical.wards（病区，科室+院区归属）查询。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/* ------------------------------- 院区 -------------------------------- */

export interface Campus {
  id: string;
  code: string;
  name: string;
  address: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

const CAMPUS_COLS = `id, code, name, address, status, created_at, updated_at`;

function mapCampus(row: Record<string, unknown>): Campus {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    address: row.address ? String(row.address) : null,
    status: row.status as Campus['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listCampuses(onlyActive = false, sql?: DbExecutor): Promise<Campus[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(CAMPUS_COLS)} FROM clinical.campuses
    ${onlyActive ? db.unsafe("WHERE status = 'active'") : db.unsafe('')}
    ORDER BY code
  `;
  return (rows as Record<string, unknown>[]).map(mapCampus);
}

export async function getCampusByCode(code: string, sql?: DbExecutor): Promise<Campus | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(CAMPUS_COLS)} FROM clinical.campuses WHERE code = ${code}
  `;
  return rows.length > 0 ? mapCampus(rows[0] as Record<string, unknown>) : null;
}

/* ------------------------------- 病区 -------------------------------- */

export interface Ward {
  id: string;
  code: string;
  name: string;
  department: string;
  campusId: string;
  floor: string | null;
  nurseStation: string | null;
  director: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

const WARD_COLS = `
  w.id, w.code, w.name, w.department, w.campus_id, w.floor, w.nurse_station, w.director, w.status, w.created_at, w.updated_at
`;

function mapWard(row: Record<string, unknown>): Ward {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    department: String(row.department),
    campusId: String(row.campus_id),
    floor: row.floor ? String(row.floor) : null,
    nurseStation: row.nurse_station ? String(row.nurse_station) : null,
    director: row.director ? String(row.director) : null,
    status: row.status as Ward['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface WardQuery {
  campusCode?: string;
  department?: string;
  status?: 'active' | 'inactive';
}

export async function listWards(query: WardQuery = {}, sql?: DbExecutor): Promise<Ward[]> {
  const db = sql ?? getDb();
  // 参数化，杜绝 SQL 注入（campusCode/department 为外部输入）
  const campusCode = query.campusCode ?? null;
  const department = query.department ?? null;
  const status = query.status ?? 'active';
  const rows = await db`
    SELECT ${db.unsafe(WARD_COLS)}
    FROM clinical.wards w
    LEFT JOIN clinical.campuses c ON c.id = w.campus_id
    WHERE (${campusCode}::text IS NULL OR c.code = ${campusCode})
      AND (${department}::text IS NULL OR w.department = ${department})
      AND w.status = ${status}
    ORDER BY w.code
  `;
  return (rows as Record<string, unknown>[]).map(mapWard);
}

export async function getWardById(id: string, sql?: DbExecutor): Promise<Ward | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(WARD_COLS)} FROM clinical.wards w WHERE w.id = ${id}`;
  return rows.length > 0 ? mapWard(rows[0] as Record<string, unknown>) : null;
}

export async function getWardByCode(code: string, sql?: DbExecutor): Promise<Ward | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(WARD_COLS)} FROM clinical.wards w WHERE w.code = ${code}`;
  return rows.length > 0 ? mapWard(rows[0] as Record<string, unknown>) : null;
}
