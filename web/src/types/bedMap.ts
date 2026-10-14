/**
 * 健澜科技 jlmedaios - 全院床位图前端类型
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 空床=绿 / 占床=蓝 / 隔离=橙 / maintenance=灰 */
export type BedMapStatus = 'available' | 'occupied' | 'isolation' | 'maintenance';

export interface BedMapPatient {
  patientId: string;
  name: string;
  gender: string;
  age: number | null;
  visitId: string | null;
}

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
  demo: boolean;
  updatedAt: string;
  rows: BedMapRow[];
  summary: BedMapSummary;
}

/** 状态 -> 展示文案 */
export const BED_STATUS_LABEL: Record<BedMapStatus, string> = {
  available: '空床',
  occupied: '占床',
  isolation: '隔离',
  maintenance: '维护',
};

/** 状态 -> 配色（与任务约定：空绿 / 占蓝 / 隔离橙 / 维护灰） */
export const BED_STATUS_COLOR: Record<BedMapStatus, string> = {
  available: '#52c41a',
  occupied: '#1677ff',
  isolation: '#fa8c16',
  maintenance: '#8c8c8c',
};
