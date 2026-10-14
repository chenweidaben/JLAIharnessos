/**
 * 健澜科技 jlmedaios - 全院床位图聚合器
 *
 * 只读聚合：把 clinical.beds 关联 clinical.wards / clinical.patients 摊平成“全院床位状态视图”。
 * 床位四态（与 bedRepo 对齐，前端配色：空=绿 / 占=蓝 / 隔离=橙 / 维护=灰）：
 *   available 空闲 / occupied 占用 / isolation 隔离 / maintenance 维护。
 *
 * 设计要点：
 *  - groupByRoom / summarize 为纯函数，便于单测与前端复用；
 *  - listView 在“无床位数据”或“DB 不可用”时返回 demo:true 的演示行（覆盖四态），
 *    保证护士站大屏在空库/断库时仍可演示，不抛 5xx；
 *  - 患者姓名在库里为加密/掩码存储，此处不做解密，仅展示掩码名与性别/年龄（脱敏合规）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/** 床位状态：空床 available / 占床 occupied / 隔离 isolation / 维护 maintenance */
export type BedMapStatus = 'available' | 'occupied' | 'isolation' | 'maintenance';

/** 弹窗中的患者摘要（脱敏） */
export interface BedMapPatient {
  /** 脱敏后的展示用患者标识 */
  patientId: string;
  /** 掩码姓名或“（未登记）” */
  name: string;
  gender: string;
  age: number | null;
  visitId: string | null;
}

/** 单张床位的视图行 */
export interface BedMapRow {
  bedId: string;
  bedNo: string;
  roomNo: string;
  floor: string;
  wardId: string;
  wardName: string;
  department: string;
  status: BedMapStatus;
  bedType: string;
  occupiedAt: string | null;
  patient: BedMapPatient | null;
}

/** 按楼层/房号聚合出的一个房间组 */
export interface RoomGroup {
  key: string;
  floor: string;
  roomNo: string;
  wardId: string;
  wardName: string;
  department: string;
  beds: BedMapRow[];
}

export interface BedMapSummary {
  total: number;
  available: number;
  occupied: number;
  isolation: number;
  maintenance: number;
}

export interface BedMapView {
  /** true 表示当前为演示数据（无真实床位） */
  demo: boolean;
  updatedAt: string;
  rows: BedMapRow[];
  summary: BedMapSummary;
}

/* ------------------------------- 纯函数 ------------------------------- */

/**
 * groupByRoom：按楼层/房号把床位行分组成房间网格。
 *
 * 分组键 = 楼层 + 房号 + 病区；组内按床号自然序，组间按楼层、房号自然序。
 * 纯函数：不修改入参，不读外部状态。
 */
export function groupByRoom(beds: BedMapRow[]): RoomGroup[] {
  const map = new Map<string, RoomGroup>();
  for (const bed of beds) {
    const key = `${bed.floor}||${bed.roomNo}||${bed.wardId}`;
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        floor: bed.floor,
        roomNo: bed.roomNo,
        wardId: bed.wardId,
        wardName: bed.wardName,
        department: bed.department,
        beds: [],
      };
      map.set(key, group);
    }
    group.beds.push(bed);
  }

  const groups = [...map.values()];
  const collator = new Intl.Collator('zh-Hans-CN', { numeric: true });
  for (const g of groups) {
    g.beds.sort((a, b) => collator.compare(a.bedNo, b.bedNo));
  }
  groups.sort(
    (a, b) =>
      collator.compare(a.floor, b.floor) || collator.compare(a.roomNo, b.roomNo),
  );
  return groups;
}

/** 统计四态床位数量（纯函数）。 */
export function summarize(rows: BedMapRow[]): BedMapSummary {
  const s: BedMapSummary = {
    total: rows.length,
    available: 0,
    occupied: 0,
    isolation: 0,
    maintenance: 0,
  };
  for (const r of rows) {
    if (r.status === 'occupied') s.occupied += 1;
    else if (r.status === 'isolation') s.isolation += 1;
    else if (r.status === 'maintenance') s.maintenance += 1;
    else s.available += 1;
  }
  return s;
}

/* ----------------------------- 数据读取 ------------------------------ */

function ageFromBirth(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const t = Date.parse(birthDate);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 31_557_600_000));
}

function mapRow(row: Record<string, unknown>): BedMapRow {
  const status = row.status as BedMapStatus;
  const visitId = row.current_visit_id ? String(row.current_visit_id) : null;
  const patientId = row.current_patient_id ? String(row.current_patient_id) : null;
  const occupied = status === 'occupied' || status === 'isolation';
  return {
    bedId: String(row.id),
    bedNo: String(row.bed_no),
    roomNo: String(row.room_no ?? '-'),
    floor: String(row.floor ?? '未分配'),
    wardId: String(row.ward_id ?? ''),
    wardName: String(row.ward_name ?? '未分配病区'),
    department: String(row.department ?? ''),
    status: ['available', 'occupied', 'isolation', 'maintenance'].includes(status)
      ? status
      : 'available',
    bedType: String(row.bed_type ?? 'standard'),
    occupiedAt: row.occupied_at ? String(row.occupied_at) : null,
    patient:
      occupied && patientId
        ? {
            patientId: patientId.slice(0, 8),
            name: row.name_masked ? String(row.name_masked) : '（未登记）',
            gender: row.gender ? String(row.gender) : '未知',
            age: ageFromBirth(row.birth_date ? String(row.birth_date) : null),
            visitId,
          }
        : null,
  };
}

async function queryAllBeds(): Promise<BedMapRow[]> {
  const db = getDb();
  const rows = await db`
    SELECT b.id, b.bed_no, COALESCE(b.room_no, '-') AS room_no,
           COALESCE(w.floor, '未分配') AS floor,
           w.id AS ward_id, w.name AS ward_name, w.department,
           b.status, b.bed_type, b.current_visit_id, b.current_patient_id, b.occupied_at,
           p.gender, p.name_masked, p.birth_date
    FROM clinical.beds b
    LEFT JOIN clinical.wards w ON w.id = b.ward_id
    LEFT JOIN clinical.patients p ON p.id = b.current_patient_id
    ORDER BY w.code, b.sort_order, b.bed_no
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/* ----------------------------- 演示兜底 ------------------------------ */

function demoRows(): BedMapRow[] {
  const heart: Pick<BedMapRow, 'wardId' | 'wardName' | 'department'> = {
    wardId: 'ward-cardiology',
    wardName: '心内科一病区',
    department: '心血管内科',
  };
  const surg: Pick<BedMapRow, 'wardId' | 'wardName' | 'department'> = {
    wardId: 'ward-surgery',
    wardName: '普外科病区',
    department: '普通外科',
  };
  const mk = (
    n: number,
    room: string,
    status: BedMapStatus,
    patient: BedMapPatient | null,
    extra: Partial<BedMapRow> = {},
  ): BedMapRow => ({
    bedId: `demo-${room}-${n}`,
    bedNo: `${String(n).padStart(2, '0')}`,
    roomNo: room,
    floor: room.slice(0, room.length - 2),
    ...(room.startsWith('5') ? heart : surg),
    status,
    bedType: status === 'isolation' ? 'isolation' : 'standard',
    occupiedAt: patient ? new Date().toISOString() : null,
    patient,
    ...extra,
  });

  return [
    mk(1, '501', 'available', null),
    mk(2, '501', 'occupied', { patientId: 'pat-demo-01', name: '张*三', gender: '男', age: 63, visitId: 'v-1001' }),
    mk(3, '501', 'occupied', { patientId: 'pat-demo-02', name: '李*四', gender: '女', age: 58, visitId: 'v-1002' }),
    mk(1, '502', 'isolation', { patientId: 'pat-demo-03', name: '王*五', gender: '男', age: 70, visitId: 'v-1003' }),
    mk(2, '502', 'available', null),
    mk(1, '601', 'occupied', { patientId: 'pat-demo-04', name: '赵*六', gender: '男', age: 45, visitId: 'v-2001' }),
    mk(2, '601', 'available', null),
    mk(3, '601', 'maintenance', null),
    mk(4, '601', 'available', null),
  ];
}

/**
 * listView：全院床位状态列表。
 *
 * 有真实床位时返回 demo:false；无数据或 DB 异常时返回 demo:true 的演示行（覆盖四态）。
 */
export async function listView(): Promise<BedMapView> {
  let rows: BedMapRow[] = [];
  try {
    rows = await queryAllBeds();
  } catch {
    rows = [];
  }
  if (rows.length === 0) {
    const demo = demoRows();
    return { demo: true, updatedAt: new Date().toISOString(), rows: demo, summary: summarize(demo) };
  }
  return { demo: false, updatedAt: new Date().toISOString(), rows, summary: summarize(rows) };
}
