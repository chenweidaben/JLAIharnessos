/**
 * 健澜科技 jlmedaios - 患者端慢病视图聚合器（M39-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { listPlans, listVitalsByPatient } from '../../db/repositories/chronicRepo.js';
import { summarize } from '../../medical-tools/nursing/patientChronic.js';

export class PatientChronicError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'PatientChronicError';
  }
}
const forbidden = (m: string) => new PatientChronicError(403, 'FORBIDDEN', m);

export async function myChronicView(auth: AuthView): Promise<ReturnType<typeof summarize>> {
  if (!auth.rawRoles.includes('patient')) throw forbidden('仅患者本人可访问');
  if (!auth.permissions.includes('patient_chronic:view')) throw forbidden('缺少权限：patient_chronic:view');
  const patientId = auth.id;
  const [plans, vitals] = await Promise.all([listPlans(patientId), listVitalsByPatient(patientId)]);
  return summarize(plans, vitals, new Date());
}
