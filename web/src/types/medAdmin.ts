/**
 * 健澜科技 jlmedaios - 给药三查七对 MAR 前端类型（M17-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

export type MedAdminStatus = 'planned' | 'arrived' | 'given' | 'held' | 'waste' | 'cancelled';
export type MedErrorType = 'none' | 'medication_error' | 'adr' | 'wrong_patient' | 'wrong_med';

export interface MedAdministration {
  id: string;
  orderId: string;
  visitId: string;
  patientId: string;
  medName: string;
  dose: string;
  route: string;
  medFreq: string;
  checkPatient: boolean;
  checkMed: boolean;
  checkDose: boolean;
  checkTime: boolean;
  checkExpire: boolean;
  highRisk: boolean;
  doubleCheckBy: string | null;
  administeredBy: string;
  signature: string;
  cdsBlocked: boolean;
  overrideReason: string | null;
  status: MedAdminStatus;
  errorType: MedErrorType | null;
  occurredAt: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecuteMedPayload {
  orderId: string;
  visitId: string;
  medName: string;
  dose: string;
  route?: string;
  medFreq?: string;
  wristbandPatientId: string;
  orderMedName?: string;
  orderDose?: string;
  withinTimeWindow?: boolean;
  notExpired?: boolean;
  cdsBlocked?: boolean;
  overrideReason?: string | null;
  doubleCheckBy?: string | null;
  signature: string;
  status?: MedAdminStatus;
  errorType?: MedErrorType | null;
  idempotencyKey: string;
}

export interface CheckItemView {
  key: 'patient' | 'med' | 'dose' | 'time' | 'expire';
  label: string;
  ok: boolean;
  expected: string;
  actual: string;
}

export interface ExecuteMedResultView {
  administration: MedAdministration;
  checks: CheckItemView[];
  highRisk: boolean;
}

export interface MedErrorMetricsView {
  medErrorRate: number;
  fractions: { medErrorRate: { numerator: number; denominator: number } };
}

export interface MedErrorMetricsResponse {
  totalAdministrations: number;
  metrics: MedErrorMetricsView;
}
