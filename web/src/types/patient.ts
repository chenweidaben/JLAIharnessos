/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者 / 就诊 / 病历类型
 */
import type { Gender, ID } from './common';

export type CareLevel = 'special' | 'first' | 'second' | 'third';

export interface Patient {
  id: ID;
  patientNo: string;
  name: string;
  gender: Gender;
  age: number;
  birthDate: string;
  idCardMasked: string;
  phoneMasked: string;
  address?: string;
  bedNo?: string;
  diagnosis?: string;
  deptName?: string;
  careLevel?: CareLevel;
  allergies?: string[];
}

export interface Encounter {
  id: ID;
  patientId: ID;
  encounterNo: string;
  type: 'inpatient' | 'outpatient' | 'emergency';
  deptName: string;
  doctorName: string;
  startTime: string;
  endTime?: string;
  chiefComplaint?: string;
  status: 'ongoing' | 'finished';
}

export interface VitalSign {
  id: ID;
  encounterId: ID;
  measureTime: string;
  temperature?: number;
  heartRate?: number;
  respiration?: number;
  systolic?: number;
  diastolic?: number;
  spo2?: number;
}

/* 检验报告 */
export type LabFlag = 'normal' | 'high' | 'low' | 'critical';

export interface LabItem {
  name: string;
  value: number | string;
  unit: string;
  /** 参考范围文本，如 3.5-5.3 */
  refRange: string;
  flag: LabFlag;
}

export interface LabReport {
  id: ID;
  reportNo: string;
  category: string;
  specimen?: string;
  reportTime: string;
  status: 'preliminary' | 'final' | 'critical';
  reporter: string;
  items: LabItem[];
}

/* 医嘱 */
export type OrderCategory = 'medication' | 'examination' | 'lab' | 'nursing' | 'diet' | 'treatment';
export type OrderStatus = 'active' | 'stopped' | 'completed' | 'pending';

export interface OrderRecord {
  id: ID;
  category: OrderCategory;
  content: string;
  dosage?: string;
  frequency?: string;
  startDate: string;
  stopDate?: string;
  doctorName: string;
  status: OrderStatus;
  priority?: 'routine' | 'urgent' | 'stat';
  longTerm: boolean;
}

/* 病历文书 */
export type DocType = 'admission' | 'progress' | 'round' | 'discharge' | 'consent' | 'consultation';

export interface MedicalDocument {
  id: ID;
  docType: DocType;
  title: string;
  authorName: string;
  recordTime: string;
  status: 'draft' | 'signed' | 'audited';
  summary: string;
}

/* 影像检查报告 */
export interface ImagingReport {
  id: ID;
  reportNo: string;
  modality: 'CT' | 'MR' | 'DR' | 'US' | 'XA' | 'ECG';
  part: string;
  reportTime: string;
  finding: string;
  impression: string;
  reporter: string;
  status: 'preliminary' | 'final';
}

export interface Patient360 {
  patient: Patient;
  encounters: Encounter[];
  vitalSigns: VitalSign[];
  alertCount: number;
  labReports: LabReport[];
  orders: OrderRecord[];
  documents: MedicalDocument[];
  imagings: ImagingReport[];
}
