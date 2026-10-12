/**
 * 健澜科技 jlmedaios - 护理出入量前端类型（M17-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type IoDirection = 'intake' | 'output';
export type IoCategory =
  | 'oral' | 'tube_feed' | 'iv' | 'blood_product'
  | 'urine' | 'stool' | 'drain' | 'vomit' | 'sweat' | 'other';

export interface IoRecord {
  id: string;
  visitId: string;
  patientId: string;
  direction: IoDirection;
  category: IoCategory;
  amountMl: number;
  recordTime: string;
  note: string | null;
}

export interface IoBalance {
  intakeTotal: number;
  outputTotal: number;
  balance: number;
}

export type Shift = 'day' | 'evening' | 'night';

export interface IoBalanceView {
  all: IoBalance;
  last24h: IoBalance;
  byShift: Record<Shift, IoBalance>;
}

export interface RecordIoReq {
  visitId: string;
  direction: IoDirection;
  category: IoCategory;
  amountMl: number;
  recordTime?: string;
  note?: string;
}
