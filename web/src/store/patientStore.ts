/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者状态：当前患者 / 患者列表 / 患者360数据
 */
import { create } from 'zustand';

import type { Patient, Patient360 } from '@/types/patient';

interface PatientState {
  patientList: Patient[];
  currentPatient: Patient | null;
  patient360: Patient360 | null;
  setPatientList: (list: Patient[]) => void;
  selectPatient: (patient: Patient) => void;
  setPatient360: (data: Patient360) => void;
  clearCurrent: () => void;
}

export const usePatientStore = create<PatientState>()((set) => ({
  patientList: [],
  currentPatient: null,
  patient360: null,

  setPatientList: (list) => set({ patientList: list }),
  selectPatient: (patient) => set({ currentPatient: patient }),
  setPatient360: (data) => set({ patient360: data, currentPatient: data.patient }),
  clearCurrent: () => set({ currentPatient: null, patient360: null }),
}));
