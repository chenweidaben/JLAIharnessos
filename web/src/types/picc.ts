/**
 * 健澜科技 jlmedaios - PICC 维护类型（M68-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export type Complication = 'none' | 'thrombosis' | 'infection' | 'dislodged' | 'occluded';

export interface PiccMaintenance {
  id: string;
  patientId: string;
  deviceType: 'picc' | 'port';
  insertedAt: string;
  lastMaintainedAt: string;
  dressingChanged: boolean;
  flushed: boolean;
  complication: Complication | null;
  notes: string | null;
  nurse: string;
  createdAt: string;
}

export interface RecordPiccInput {
  patientId: string;
  deviceType: 'picc' | 'port';
  insertedAt: string;
  lastMaintainedAt: string;
  dressingChanged?: boolean;
  flushed?: boolean;
  complication?: Complication | null;
  notes?: string | null;
}
