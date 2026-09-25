/**
 * 健澜科技 jlmedaios - 住院聚合器（ADT 状态机 + 床位图读模型）
 *
 * 真实落 PostgreSQL，去 mock。实现住院核心事务状态机：
 *
 *   入院登记 admit ──► 分配床位（在院 ongoing / bed occupied）
 *                        │
 *            ┌───────────┼───────────────┐
 *            ▼                           ▼
 *      换床 bed_change（同病区）    转科 transfer（换科室/病区/床）
 *            └───────────┬───────────────┘
 *                        ▼
 *                  出院 discharge ──► 释放床位（visit discharged / bed available）
 *
 * 严谨性：
 *  - 床位分配并发安全（bedRepo：FOR UPDATE SKIP LOCKED + CAS + 唯一索引）；
 *  - DataScope：按住院医护可操作范围（hospital/dept/self）约束读写；
 *  - 全程审计：每次 ADT 事务同写 audit.audit_logs 哈希链；
 *  - AI 不得直接产生在院事务：本聚合器仅由 BFF 路由以“真实登录医师/护士”身份调用，
 *      不向 Agent 暴露任何写操作；操作者即经治/入院医师，需医师复核签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import type {
  Bed,
  BedStatus,
  BedType,
} from '../../db/repositories/bedRepo.js';
import {
  allocateBed,
  BedAllocationError,
  countBedsByStatus,
  getBedById,
  listBedsByWard,
  releaseBed,
  setBedStatus,
} from '../../db/repositories/bedRepo.js';
import type { Ward } from '../../db/repositories/wardRepo.js';
import {
  getWardById,
  listCampuses,
  listWards,
} from '../../db/repositories/wardRepo.js';
import type {
  Admission,
  AdmissionSource,
  AdmissionType,
  AdtEvent,
  ConditionLevel,
  InpatientRecordRow,
} from '../../db/repositories/admissionRepo.js';
import {
  createAdmission,
  createAdtEvent,
  findCurrentInpatients,
  getAdmissionByVisit,
  listAdtEvents,
  markAdmissionDischarged,
  updateAdmissionLocation,
} from '../../db/repositories/admissionRepo.js';
import {
  createPatient,
  getPatientByMrn,
  type PatientCreateInput,
} from '../../db/repositories/patientRepo.js';
import {
  createVisit,
  getVisitById,
  updateVisit,
  type Visit,
} from '../../db/repositories/visitRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getDb } from '../../db/pool.js';

/* ----------------------------- 错误类型 ------------------------------ */

export class InpatientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InpatientError';
  }
}
const badRequest = (m: string) => new InpatientError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new InpatientError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new InpatientError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new InpatientError(409, 'CONFLICT', m);

/* ----------------------------- 公共 DTO ------------------------------ */

export interface BedOccupantSummary {
  visitId: string;
  patientId: string;
  mrn: string;
  nameMasked: string;
  gender: string;
  age: number | null;
  diagnosis: string;
  condition: ConditionLevel;
  nursingLevel: string;
  attendingDoctorId: string | null;
  admittedAt: string | null;
  allergies: Array<Record<string, unknown>>;
  tags: string[];
}

export interface BedCell {
  id: string;
  bedNo: string;
  roomNo: string | null;
  bedType: BedType;
  status: BedStatus;
  occupant: BedOccupantSummary | null;
}

export interface WardBedMap {
  id: string;
  code: string;
  name: string;
  department: string;
  campusId: string;
  campusCode: string;
  campusName: string;
  floor: string | null;
  stats: { total: number; available: number; occupied: number; maintenance: number; isolation: number };
  beds: BedCell[];
}

export interface BedMapResponse {
  campuses: Array<{ code: string; name: string }>;
  wards: WardBedMap[];
  generatedAt: string;
}

export interface InpatientListItem {
  visitId: string;
  visitNo: string;
  patientId: string;
  mrn: string;
  nameMasked: string;
  gender: string;
  age: number | null;
  department: string;
  wardId: string | null;
  wardName: string | null;
  bedId: string | null;
  bedNo: string | null;
  roomNo: string | null;
  diagnosis: string;
  condition: ConditionLevel | null;
  nursingLevel: string;
  attendingDoctorId: string | null;
  admittedAt: string | null;
  daysInHospital: number;
  allergies: Array<Record<string, unknown>>;
  tags: string[];
}

export interface MovementView {
  id: string;
  eventType: AdtEvent['eventType'];
  fromWard: string | null;
  toWard: string | null;
  fromBed: string | null;
  toBed: string | null;
  fromDepartment: string | null;
  toDepartment: string | null;
  reason: string | null;
  operatorId: string | null;
  eventAt: string;
}

export interface InpatientDetail extends InpatientListItem {
  admissionNo: string | null;
  admissionType: AdmissionType | null;
  source: AdmissionSource | null;
  movements: MovementView[];
}

/* ----------------------------- 映射辅助 ------------------------------ */

export function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** 病情分级 → 护理等级（critical 特级 / serious 一级 / stable 二级） */
export function nursingLevelOf(condition: ConditionLevel | null): string {
  if (condition === 'critical') return 'special';
  if (condition === 'serious') return 'level1';
  return 'level2';
}

function daysBetween(from: string | null): number {
  if (!from) return 0;
  const ms = Date.now() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function toListItem(r: InpatientRecordRow): InpatientListItem {
  return {
    visitId: r.visitId,
    visitNo: r.visitNo,
    patientId: r.patientId,
    mrn: r.mrn,
    nameMasked: r.nameMasked,
    gender: r.gender,
    age: calcAge(r.birthDate),
    department: r.department,
    wardId: r.wardId,
    wardName: r.wardName,
    bedId: r.bedId,
    bedNo: r.bedNo,
    roomNo: r.roomNo,
    diagnosis: r.diagnosis ?? '',
    condition: r.condition,
    nursingLevel: nursingLevelOf(r.condition),
    attendingDoctorId: r.attendingDoctorId,
    admittedAt: r.admittedAt,
    daysInHospital: daysBetween(r.admittedAt),
    allergies: r.allergies,
    tags: r.tags,
  };
}

function toOccupant(r: InpatientRecordRow): BedOccupantSummary {
  return {
    visitId: r.visitId,
    patientId: r.patientId,
    mrn: r.mrn,
    nameMasked: r.nameMasked,
    gender: r.gender,
    age: calcAge(r.birthDate),
    diagnosis: r.diagnosis ?? '',
    condition: r.condition ?? 'stable',
    nursingLevel: nursingLevelOf(r.condition),
    attendingDoctorId: r.attendingDoctorId,
    admittedAt: r.admittedAt,
    allergies: r.allergies,
    tags: r.tags,
  };
}

/* --------------------------- DataScope 约束 --------------------------- */

/** 病区级操作范围：all 全开放；dept/group 限本科室；其余拒绝 */
function canAccessWard(auth: AuthView, ward: Ward): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return ward.department === auth.deptName;
  }
  return false;
}

/**
 * 在院患者操作范围：
 *  all 全开放；dept/group 限本科室患者；self 限本人经治患者。
 */
function canOperateRecord(
  auth: AuthView,
  rec: { department: string; attendingDoctorId: string | null },
): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return rec.department === auth.deptName;
  }
  if (auth.dataScope === 'self') return rec.attendingDoctorId === auth.id;
  return false;
}

/** 读模型的有效过滤（按 DataScope 收敛） */
function effectiveFilter(
  auth: AuthView,
  req: { campusCode?: string | null; department?: string | null; wardId?: string | null },
) {
  if (auth.dataScope === 'all') {
    return {
      campusCode: req.campusCode ?? null,
      department: req.department ?? null,
      wardId: req.wardId ?? null,
    };
  }
  // dept / group / self：强制限定到本人科室
  return {
    campusCode: null,
    department: auth.deptName,
    wardId: null,
  };
}

/* --------------------------- 读：床位图 ------------------------------ */

export async function getBedMap(
  auth: AuthView,
  query: { campusCode?: string; department?: string; wardId?: string } = {},
): Promise<BedMapResponse> {
  const filter = effectiveFilter(auth, query);

  // 病区列表（按过滤）
  const wardRows = await listWards({
    campusCode: filter.campusCode ?? undefined,
    department: filter.department ?? undefined,
    status: 'active',
  });
  let wards = wardRows;
  if (filter.wardId) wards = wards.filter((w) => w.id === filter.wardId);

  // 在院患者（一次取全，按 bedId 建索引）
  const inpatients = await findCurrentInpatients(filter);
  const byBed = new Map<string, InpatientRecordRow>();
  for (const ip of inpatients) {
    if (ip.bedId) byBed.set(ip.bedId, ip);
  }

  const campuses = await listCampuses(true);
  const campusMap = new Map(campuses.map((c) => [c.id, c]));

  const wardMaps: WardBedMap[] = [];
  for (const w of wards) {
    const beds: Bed[] = await listBedsByWard(w.id);
    const stats = await countBedsByStatus(w.id);
    const campus = campusMap.get(w.campusId);
    wardMaps.push({
      id: w.id,
      code: w.code,
      name: w.name,
      department: w.department,
      campusId: w.campusId,
      campusCode: campus?.code ?? '',
      campusName: campus?.name ?? '',
      floor: w.floor,
      stats: {
        total: beds.length,
        available: stats.available,
        occupied: stats.occupied,
        maintenance: stats.maintenance,
        isolation: stats.isolation,
      },
      beds: beds.map((b) => ({
        id: b.id,
        bedNo: b.bedNo,
        roomNo: b.roomNo,
        bedType: b.bedType,
        status: b.status,
        occupant: byBed.get(b.id) ? toOccupant(byBed.get(b.id)!) : null,
      })),
    });
  }

  return {
    campuses: campuses.map((c) => ({ code: c.code, name: c.name })),
    wards: wardMaps,
    generatedAt: new Date().toISOString(),
  };
}

/* --------------------------- 读：在院列表 ----------------------------- */

export async function listInpatients(
  auth: AuthView,
  query: { campusCode?: string; department?: string; wardId?: string } = {},
): Promise<{ items: InpatientListItem[]; total: number }> {
  const filter = effectiveFilter(auth, query);
  const rows = await findCurrentInpatients(filter);
  const items = rows.map(toListItem);
  return { items, total: items.length };
}

/* --------------------------- 读：在院详情 ----------------------------- */

export async function getInpatientDetail(
  auth: AuthView,
  visitId: string,
): Promise<InpatientDetail> {
  const filter = effectiveFilter(auth, {});
  const rows = await findCurrentInpatients({ ...filter, wardId: null });
  const rec = rows.find((r) => r.visitId === visitId);
  if (!rec) throw notFound('在院患者不存在或已出院');
  if (!canOperateRecord(auth, rec)) {
    throw forbidden('超出数据权限范围，无法查看该患者');
  }

  const admission = await getAdmissionByVisit(visitId);
  const events = await listAdtEvents(visitId);

  // 病区/床位代码解析
  const wardIds = new Set<string>();
  const bedIds = new Set<string>();
  for (const e of events) {
    if (e.fromWardId) wardIds.add(e.fromWardId);
    if (e.toWardId) wardIds.add(e.toWardId);
    if (e.fromBedId) bedIds.add(e.fromBedId);
    if (e.toBedId) bedIds.add(e.toBedId);
  }
  const wardNameMap = new Map<string, string>();
  for (const id of wardIds) {
    const w = await getWardById(id);
    if (w) wardNameMap.set(id, w.name);
  }
  const bedNameMap = new Map<string, string>();
  for (const id of bedIds) {
    const b = await getBedById(id);
    if (b) bedNameMap.set(id, b.bedNo);
  }

  const movements: MovementView[] = events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    fromWard: e.fromWardId ? wardNameMap.get(e.fromWardId) ?? null : null,
    toWard: e.toWardId ? wardNameMap.get(e.toWardId) ?? null : null,
    fromBed: e.fromBedId ? bedNameMap.get(e.fromBedId) ?? null : null,
    toBed: e.toBedId ? bedNameMap.get(e.toBedId) ?? null : null,
    fromDepartment: e.fromDepartment,
    toDepartment: e.toDepartment,
    reason: e.reason,
    operatorId: e.operatorId,
    eventAt: e.eventAt,
  }));

  return {
    ...toListItem(rec),
    admissionNo: admission?.admissionNo ?? null,
    admissionType: admission?.admissionType ?? null,
    source: admission?.source ?? null,
    movements,
  };
}

/* --------------------------- 写：入院登记 ----------------------------- */

export interface AdmitInput {
  mrn?: string; // 既有患者
  newPatient?: {
    nameMasked: string;
    gender: '男' | '女' | '未知' | '未说明';
    birthDate?: string | null;
    bloodType?: string | null;
    allergies?: Array<Record<string, unknown>>;
    pastHistory?: Array<Record<string, unknown>>;
    tags?: string[];
  };
  wardId: string;
  bedId?: string;
  diagnosis: string;
  condition: ConditionLevel;
  admissionType: AdmissionType;
  source: AdmissionSource;
}

export async function admit(auth: AuthView, input: AdmitInput): Promise<InpatientListItem> {
  if (!input.diagnosis?.trim()) throw badRequest('入院诊断不能为空');
  const ward = await getWardById(input.wardId);
  if (!ward || ward.status !== 'active') throw badRequest('病区不存在或已停用');
  if (!canAccessWard(auth, ward)) {
    throw forbidden('超出数据权限范围，无法向该病区收治患者');
  }

  const db = getDb();
  return db.begin(async (tx) => {
    // 1) 先取顺序号（住院号/就诊号/新患者 mrn 共用同一序号，1:1 可交叉核对）
    const seqRows = await tx`SELECT nextval('clinical.admission_no_seq')::bigint AS n`;
    const padded = String(seqRows[0].n).padStart(6, '0');
    const visitNo = `IP${padded}`;
    const admissionNo = `ZY${padded}`;
    const newMrn = `PAT${padded}`;

    // 2) 解析/创建患者（新患者直接使用确定 mrn，避免占位号并发唯一冲突）
    let patientId: string;
    if (input.mrn) {
      const p = await getPatientByMrn(input.mrn, tx);
      if (!p) throw badRequest(`患者不存在: ${input.mrn}`);
      patientId = p.id;
    } else if (input.newPatient) {
      const np = input.newPatient;
      const create: PatientCreateInput = {
        mrn: newMrn,
        nameMasked: np.nameMasked,
        gender: np.gender,
        birthDate: np.birthDate ?? null,
        bloodType: np.bloodType ?? null,
        allergies: np.allergies ?? [],
        pastHistory: np.pastHistory ?? [],
        tags: np.tags ?? [],
      };
      const p = await createPatient(create, tx);
      patientId = p.id;
    } else {
      throw badRequest('需指定既有患者 mrn 或提供新患者信息');
    }

    // 3) 防止重复入院（已有 ongoing 住院就诊）
    const existing = await findCurrentInpatients({}, tx);
    if (existing.some((e) => e.patientId === patientId)) {
      throw conflict('该患者已存在在院住院记录，不能重复入院');
    }

    // 4) 创建住院就诊（先不绑床）
    let visit: Visit = await createVisit(
      {
        patientId,
        visitNo,
        visitType: 'inpatient',
        department: ward.department,
        ward: ward.name,
        bedNo: '',
        wardId: ward.id,
        attendingDoctorId: auth.id, // 操作者即入院/经治医师
        chiefComplaint: input.diagnosis,
        status: 'ongoing',
        admitAt: new Date().toISOString(),
      },
      tx,
    );

    // 5) 分配床位（并发安全）
    const bed = await allocateBed(tx, {
      bedId: input.bedId,
      wardId: ward.id,
      visitId: visit.id,
      patientId,
    });

    // 6) 回绑就诊床位
    visit = await updateVisit(
      visit.id,
      { bedId: bed.id, bedNo: bed.bedNo },
      tx,
    );

    // 7) 入院记录
    await createAdmission(
      {
        admissionNo,
        visitId: visit.id,
        patientId,
        wardId: ward.id,
        bedId: bed.id,
        department: ward.department,
        admittingDoctorId: auth.id,
        admissionType: input.admissionType,
        source: input.source,
        diagnosis: input.diagnosis,
        conditionOnAdmission: input.condition,
        admittedAt: new Date().toISOString(),
      },
      tx,
    );

    // 8) ADT 事件
    await createAdtEvent(
      {
        visitId: visit.id,
        patientId,
        eventType: 'admit',
        toWardId: ward.id,
        toBedId: bed.id,
        toDepartment: ward.department,
        reason: '入院登记',
        operatorId: auth.id,
        eventAt: new Date().toISOString(),
      },
      tx,
    );

    // 9) 审计（同事务）
    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: 'inpatient.admit',
        resourceType: 'visit',
        resourceId: visit.id,
        patientRef: patientId,
        visitRef: visit.id,
        result: 'success',
        detail: {
          admissionNo,
          ward: ward.code,
          bed: bed.bedNo,
          diagnosis: input.diagnosis,
          condition: input.condition,
        },
      },
      tx,
    );

    const rows = await findCurrentInpatients({ wardId: ward.id }, tx);
    const rec = rows.find((r) => r.visitId === visit.id);
    if (!rec) throw conflict('入院后未能读取在院记录');
    return toListItem(rec);
  });
}

/* ---------------------------- 写：换床 ------------------------------- */

export interface BedChangeInput {
  visitId: string;
  targetBedId: string;
  reason?: string;
}

export async function changeBed(auth: AuthView, input: BedChangeInput): Promise<InpatientListItem> {
  const visit = await getVisitById(input.visitId);
  if (!visit || visit.visitType !== 'inpatient' || visit.status !== 'ongoing') {
    throw notFound('在院住院就诊不存在或已结束');
  }
  if (!canOperateRecord(auth, visit)) {
    throw forbidden('超出数据权限范围，无法调整该患者床位');
  }
  const target = await getBedById(input.targetBedId);
  if (!target) throw badRequest('目标床位不存在');
  if (target.wardId !== visit.wardId) {
    throw badRequest('目标床位与患者不在同一病区，跨病区/科室请使用“转科”');
  }
  if (visit.bedId === target.id) throw badRequest('目标床位与当前床位相同');

  const db = getDb();
  return db.begin(async (tx) => {
    // 先释放旧床（清除患者占用），再原子占用新床；
    // 若新床被他人抢先 → allocateBed 抛错 → 整事务回滚，旧床保持占用，患者不落空。
    await releaseBed(tx, { bedId: visit.bedId!, visitId: visit.id });
    let bed;
    try {
      bed = await allocateBed(tx, {
        bedId: target.id,
        visitId: visit.id,
        patientId: visit.patientId,
      });
    } catch (e) {
      if (e instanceof BedAllocationError) {
        throw conflict(`换床失败：${e.message}`);
      }
      throw e;
    }

    await updateVisit(visit.id, { bedId: bed.id, bedNo: bed.bedNo }, tx);
    await updateAdmissionLocation(
      visit.id,
      { wardId: visit.wardId!, bedId: bed.id, department: visit.department },
      tx,
    );
    await createAdtEvent(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        eventType: 'bed_change',
        fromWardId: visit.wardId,
        toWardId: visit.wardId,
        fromBedId: visit.bedId,
        toBedId: bed.id,
        fromDepartment: visit.department,
        toDepartment: visit.department,
        reason: input.reason ?? '床位调整',
        operatorId: auth.id,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: 'inpatient.bed_change',
        resourceType: 'visit',
        resourceId: visit.id,
        patientRef: visit.patientId,
        visitRef: visit.id,
        result: 'success',
        detail: { fromBed: visit.bedNo, toBed: bed.bedNo, reason: input.reason ?? null },
      },
      tx,
    );

    const rows = await findCurrentInpatients({ wardId: visit.wardId! }, tx);
    const rec = rows.find((r) => r.visitId === visit.id);
    if (!rec) throw conflict('换床后未能读取在院记录');
    return toListItem(rec);
  });
}

/* ---------------------------- 写：转科 ------------------------------- */

export interface TransferInput {
  visitId: string;
  targetWardId: string;
  targetBedId?: string;
  reason?: string;
}

export async function transfer(auth: AuthView, input: TransferInput): Promise<InpatientListItem> {
  const visit = await getVisitById(input.visitId);
  if (!visit || visit.visitType !== 'inpatient' || visit.status !== 'ongoing') {
    throw notFound('在院住院就诊不存在或已结束');
  }
  if (!canOperateRecord(auth, visit)) {
    throw forbidden('超出数据权限范围，无法对该患者执行转科');
  }
  const targetWard = await getWardById(input.targetWardId);
  if (!targetWard || targetWard.status !== 'active') {
    throw badRequest('目标病区不存在或已停用');
  }
  if (targetWard.id === visit.wardId) {
    throw badRequest('目标病区与当前病区相同，无需转科');
  }
  if (input.targetBedId) {
    const tb = await getBedById(input.targetBedId);
    if (!tb || tb.wardId !== targetWard.id) {
      throw badRequest('目标床位不存在或不属于目标病区');
    }
  }

  const db = getDb();
  return db.begin(async (tx) => {
    // 先释放原科室床位
    await releaseBed(tx, { bedId: visit.bedId!, visitId: visit.id });

    // 在目标病区分配床位（指定或自动）
    let bed;
    try {
      bed = await allocateBed(tx, {
        bedId: input.targetBedId,
        wardId: targetWard.id,
        visitId: visit.id,
        patientId: visit.patientId,
      });
    } catch (e) {
      if (e instanceof BedAllocationError) {
        throw conflict(`转科失败：${e.message}`);
      }
      throw e;
    }

    // 更新就诊科室/病区/床位
    await updateVisit(
      visit.id,
      {
        department: targetWard.department,
        ward: targetWard.name,
        bedNo: bed.bedNo,
        wardId: targetWard.id,
        bedId: bed.id,
      },
      tx,
    );
    await updateAdmissionLocation(
      visit.id,
      { wardId: targetWard.id, bedId: bed.id, department: targetWard.department },
      tx,
    );
    await createAdtEvent(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        eventType: 'transfer',
        fromWardId: visit.wardId,
        toWardId: targetWard.id,
        fromBedId: visit.bedId,
        toBedId: bed.id,
        fromDepartment: visit.department,
        toDepartment: targetWard.department,
        reason: input.reason ?? `转${targetWard.department}`,
        operatorId: auth.id,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: 'inpatient.transfer',
        resourceType: 'visit',
        resourceId: visit.id,
        patientRef: visit.patientId,
        visitRef: visit.id,
        result: 'success',
        detail: {
          fromDepartment: visit.department,
          toDepartment: targetWard.department,
          toBed: bed.bedNo,
          reason: input.reason ?? null,
        },
      },
      tx,
    );

    const rows = await findCurrentInpatients({ wardId: targetWard.id }, tx);
    const rec = rows.find((r) => r.visitId === visit.id);
    if (!rec) throw conflict('转科后未能读取在院记录');
    return toListItem(rec);
  });
}

/* ---------------------------- 写：出院 ------------------------------- */

export interface DischargeInput {
  visitId: string;
  reason?: string;
}

export async function discharge(auth: AuthView, input: DischargeInput): Promise<{
  visitId: string;
  dischargedAt: string;
  bedId: string | null;
}> {
  const visit = await getVisitById(input.visitId);
  if (!visit || visit.visitType !== 'inpatient' || visit.status !== 'ongoing') {
    throw notFound('在院住院就诊不存在或已结束');
  }
  if (!canOperateRecord(auth, visit)) {
    throw forbidden('超出数据权限范围，无法为该患者办理出院');
  }

  const db = getDb();
  const dischargedAt = new Date().toISOString();
  return db.begin(async (tx) => {
    // 释放床位
    await releaseBed(tx, { bedId: visit.bedId!, visitId: visit.id });
    // 就诊出院
    await updateVisit(
      visit.id,
      { status: 'discharged', dischargeAt: dischargedAt },
      tx,
    );
    await markAdmissionDischarged(visit.id, dischargedAt, tx);
    await createAdtEvent(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        eventType: 'discharge',
        fromWardId: visit.wardId,
        fromBedId: visit.bedId,
        fromDepartment: visit.department,
        reason: input.reason ?? '医嘱出院',
        operatorId: auth.id,
        eventAt: dischargedAt,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: 'inpatient.discharge',
        resourceType: 'visit',
        resourceId: visit.id,
        patientRef: visit.patientId,
        visitRef: visit.id,
        result: 'success',
        detail: { releasedBed: visit.bedNo, reason: input.reason ?? null },
      },
      tx,
    );

    return { visitId: visit.id, dischargedAt, bedId: visit.bedId };
  });
}

/* --------------------- 写：床位状态（维护/恢复） ---------------------- */

export async function changeBedMaintenance(
  auth: AuthView,
  input: { bedId: string; status: 'available' | 'maintenance' | 'isolation'; reason?: string },
): Promise<BedCell> {
  const bed = await getBedById(input.bedId);
  if (!bed) throw notFound('床位不存在');
  const ward = await getWardById(bed.wardId);
  if (!ward) throw notFound('病区不存在');
  if (!canAccessWard(auth, ward)) {
    throw forbidden('超出数据权限范围，无法调整该床位状态');
  }

  const db = getDb();
  return db.begin(async (tx) => {
    const updated = await setBedStatus(tx, { bedId: bed.id, status: input.status });
    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: 'inpatient.bed_status',
        resourceType: 'bed',
        resourceId: bed.id,
        result: 'success',
        detail: { ward: ward.code, bed: bed.bedNo, status: input.status, reason: input.reason ?? null },
      },
      tx,
    );
    return {
      id: updated.id,
      bedNo: updated.bedNo,
      roomNo: updated.roomNo,
      bedType: updated.bedType,
      status: updated.status,
      occupant: null,
    };
  });
}

/* 保留未使用导入以表达领域语义（Admission 类型在签名中可能扩展使用） */
export type { Admission };
