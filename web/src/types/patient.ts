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

export interface Patient360 {
  patient: Patient;
  encounters: Encounter[];
  vitalSigns: VitalSign[];
  alertCount: number;
}
