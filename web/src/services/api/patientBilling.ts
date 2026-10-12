/**
 * 健澜科技 jlmedaios - 患者端住院费用 API（M50-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { PatientBillingView } from '@/types/patientBilling';

const base = '/patient/billing';

export function fetchPatientBilling(patientId: string) {
  return get<PatientBillingView>(`${base}`, { patientId });
}
