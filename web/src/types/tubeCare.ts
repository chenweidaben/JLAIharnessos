/**
 * 健澜科技 jlmedaios - 管路护理前端类型（M17-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type TubeType =
  | 'cvc' | 'arterial_line' | 'urinary_catheter' | 'ng_tube' | 'feeding_tube'
  | 'chest_drain' | 'abdominal_drain' | 'other';
export type TubeStatus = 'in_place' | 'removed';
export type RemovalType = 'planned' | 'unplanned';
export type SiteIntegrity = 'good' | 'redness' | 'leak' | 'dislodged';

export interface Tube {
  id: string;
  visitId: string;
  patientId: string;
  tubeType: TubeType;
  site: string | null;
  fixationNote: string | null;
  insertedBy: string;
  insertedAt: string;
  status: TubeStatus;
  removedAt: string | null;
  removedBy: string | null;
  removalType: RemovalType | null;
  removalNote: string | null;
}

export interface ExtubationMetrics {
  totalTubes: number;
  metrics: {
    rate: number;
    fractions: { rate: { numerator: number; denominator: number } };
  };
}

export interface InsertTubeReq {
  visitId: string;
  tubeType: TubeType;
  site?: string;
  fixationNote?: string;
}
export interface AssessTubeReq {
  siteIntegrity: SiteIntegrity;
  fixationSecure: boolean;
  riskNote?: string;
}
export interface RemoveTubeReq {
  removalType: RemovalType;
  removalNote?: string;
}
