/**
 * 健澜科技 jlmedaios - WHO 手术安全核查表纯函数（M82-A）
 * 三阶段必达项 / 通过判定 / 缺项列表。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface SigninInputs {
  patient: boolean;
  allergy: boolean;
  blood: boolean;
}

export interface TimeoutInputs {
  site: boolean;
  procedure: boolean;
  antibiotic: boolean;
}

export interface SignoutInputs {
  instruments: boolean;
  patientTransfer: boolean;
}

export interface ChecklistState {
  signinComplete: boolean;
  timeoutComplete: boolean;
  signoutComplete: boolean;
  patientConfirmed: boolean;
  siteMarked: boolean;
  procedureConfirmed: boolean;
  allergyConfirmed: boolean;
  antibioticGiven: boolean;
  bloodPrepared: boolean;
  instrumentsCounted: boolean;
}

/** Sign-in 必达项。 */
export function signinItems(input: SigninInputs): Record<string, boolean> {
  return {
    patient: input.patient,
    allergy: input.allergy,
    blood: input.blood,
  };
}

/** Time-out 必达项。 */
export function timeoutItems(input: TimeoutInputs): Record<string, boolean> {
  return {
    site: input.site,
    procedure: input.procedure,
    antibiotic: input.antibiotic,
  };
}

/** Sign-out 必达项。 */
export function signoutItems(input: SignoutInputs): Record<string, boolean> {
  return {
    instruments: input.instruments,
    patientTransfer: input.patientTransfer,
  };
}

/** 三阶段全 true 且各方块确认。 */
export function isPassed(c: ChecklistState): boolean {
  return Boolean(
    c.signinComplete && c.timeoutComplete && c.signoutComplete &&
    c.patientConfirmed && c.siteMarked && c.procedureConfirmed &&
    c.allergyConfirmed && c.antibioticGiven && c.bloodPrepared && c.instrumentsCounted,
  );
}

/** 缺项列表。 */
export function missingItems(c: ChecklistState): string[] {
  const missing: string[] = [];
  if (!c.patientConfirmed) missing.push('patient_confirmed');
  if (!c.siteMarked) missing.push('site_marked');
  if (!c.procedureConfirmed) missing.push('procedure_confirmed');
  if (!c.allergyConfirmed) missing.push('allergy_confirmed');
  if (!c.antibioticGiven) missing.push('antibiotic_given');
  if (!c.bloodPrepared) missing.push('blood_prepared');
  if (!c.instrumentsCounted) missing.push('instruments_counted');
  return missing;
}
