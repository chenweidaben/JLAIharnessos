/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医嘱 / 处方 / 检验 / 检查类型
 */
import type { ID, MedicalLevel } from './common';

export interface LabResultItem {
  id: ID;
  reportId: ID;
  itemCode: string;
  itemName: string;
  value: string;
  unit?: string;
  refRange?: string;
  level: MedicalLevel;
  sampleTime: string;
}

export interface LabReport {
  id: ID;
  patientId: ID;
  reportNo: string;
  reportName: string;
  reportTime: string;
  items: LabResultItem[];
  hasCritical: boolean;
}

export type OrderType = 'drug' | 'exam' | 'lab' | 'nursing' | 'operation';

export interface MedicalOrder {
  id: ID;
  patientId: ID;
  orderNo: string;
  type: OrderType;
  name: string;
  dosage?: string;
  frequency?: string;
  doctorName: string;
  status: 'pending' | 'executing' | 'finished' | 'cancelled';
  orderTime: string;
}

export interface Prescription {
  id: ID;
  patientId: ID;
  items: { drugName: string; spec: string; dose: string; frequency: string; days: number }[];
  doctorName: string;
  status: 'draft' | 'confirmed' | 'dispensed';
  createdAt: string;
}

export interface TimelineEvent {
  id: ID;
  time: string;
  type: 'admission' | 'order' | 'lab' | 'exam' | 'consult' | 'discharge';
  title: string;
  description?: string;
  level?: MedicalLevel;
}

export type AlertType = 'critical-value' | 'allergy' | 'drug-interaction' | 'abnormal-vital';

export interface Alert {
  id: ID;
  type: AlertType;
  level: MedicalLevel;
  title: string;
  content: string;
  patientId: ID;
  createdAt: string;
  acknowledged: boolean;
}
