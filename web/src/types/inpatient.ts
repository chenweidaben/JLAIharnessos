/**
 * 健澜科技 jlmedaios - 住院工作台（M1-A ADT）类型定义
 *
 * 与 BFF src/bff/aggregators/inpatientAggregator.ts 的 DTO 1:1 对齐。
 * 真实模式下全部数据来自 BFF 并落 PostgreSQL；本文件不含任何 mock。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 床位状态：空闲 / 占用 / 维护 / 隔离 */
export type InpatientBedStatus = 'available' | 'occupied' | 'maintenance' | 'isolation';

/** 床位类型：普通 / 隔离 / ICU / 抢救 */
export type InpatientBedType = 'standard' | 'isolation' | 'icu' | 'resuscitation';

/** 病情分级：病危 / 病重 / 稳定 */
export type InpatientCondition = 'critical' | 'serious' | 'stable';

/** 入院方式：择期 / 急诊 / 转入 */
export type AdmissionType = 'elective' | 'emergency' | 'transfer';

/** 入院来源：门诊 / 急诊 / 转入 / 其他 */
export type AdmissionSource = 'outpatient' | 'emergency' | 'transfer' | 'other';

/** ADT 移动事件类型 */
export type AdtEventType = 'admit' | 'bed_change' | 'transfer' | 'discharge';

/** 床位上的患者摘要（脱敏） */
export interface BedOccupantSummary {
  visitId: string;
  patientId: string;
  mrn: string;
  nameMasked: string;
  gender: string;
  age: number | null;
  diagnosis: string;
  condition: InpatientCondition;
  nursingLevel: string;
  attendingDoctorId: string | null;
  admittedAt: string | null;
  allergies: Array<Record<string, unknown>>;
  tags: string[];
}

/** 床位单元（床位图色块） */
export interface BedCell {
  id: string;
  bedNo: string;
  roomNo: string | null;
  bedType: InpatientBedType;
  status: InpatientBedStatus;
  occupant: BedOccupantSummary | null;
}

/** 病区床位统计 */
export interface WardBedStats {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  isolation: number;
}

/** 病区级床位图 */
export interface WardBedMap {
  id: string;
  code: string;
  name: string;
  department: string;
  campusId: string;
  campusCode: string;
  campusName: string;
  floor: string | null;
  stats: WardBedStats;
  beds: BedCell[];
}

/** 床位图响应 */
export interface BedMapResponse {
  campuses: Array<{ code: string; name: string }>;
  wards: WardBedMap[];
  generatedAt: string;
}

/** 在院患者列表项 */
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
  condition: InpatientCondition | null;
  nursingLevel: string;
  attendingDoctorId: string | null;
  admittedAt: string | null;
  daysInHospital: number;
  allergies: Array<Record<string, unknown>>;
  tags: string[];
}

/** ADT 移动史 */
export interface MovementView {
  id: string;
  eventType: AdtEventType;
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

/** 在院患者详情（含入院信息与移动史） */
export interface InpatientDetail extends InpatientListItem {
  admissionNo: string | null;
  admissionType: AdmissionType | null;
  source: AdmissionSource | null;
  movements: MovementView[];
}

/** 入院登记提交载荷 */
export interface AdmitPayload {
  mrn?: string;
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
  condition: InpatientCondition;
  admissionType: AdmissionType;
  source: AdmissionSource;
}

/** BFF 就绪/健康探针结果 */
export interface SystemHealth {
  status: string;
  version?: string;
  demoMode: boolean;
  db: 'up' | 'down' | 'skipped';
  checks?: unknown[];
}
