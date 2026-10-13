/**
 * 健澜科技 jlmedaios - 手术核查表类型（M82-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export interface SurgicalChecklist {
  id: string;
  surgeryId: string;
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
  status: 'in_progress' | 'passed' | 'failed';
}

export interface StageInput {
  patientConfirmed?: boolean;
  siteMarked?: boolean;
  procedureConfirmed?: boolean;
  allergyConfirmed?: boolean;
  antibioticGiven?: boolean;
  bloodPrepared?: boolean;
  instrumentsCounted?: boolean;
}
