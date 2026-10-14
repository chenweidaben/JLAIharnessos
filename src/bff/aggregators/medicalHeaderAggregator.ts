import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/medicalHeaderRepo';

export class MedicalHeaderError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function getView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('medical_header:view')) throw new MedicalHeaderError(403, '无查看权限');
  if (!visitId) throw new MedicalHeaderError(400, 'visitId 必填');
  return repo.getByVisit(visitId);
}

export async function upsertView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('medical_header:write')) throw new MedicalHeaderError(403, '无书写权限');
  if (!body.visitId) throw new MedicalHeaderError(400, 'visitId 必填');
  if (!body.patientName) throw new MedicalHeaderError(400, '患者姓名必填');
  if (!body.admissionDate) throw new MedicalHeaderError(400, '入院日期必填');
  return repo.upsert({
    visitId: String(body.visitId), patientName: String(body.patientName),
    admissionDate: String(body.admissionDate),
    gender: body.gender ? String(body.gender) : undefined,
    birthDate: body.birthDate ? String(body.birthDate) : undefined,
    idCard: body.idCard ? String(body.idCard) : undefined,
    dischargeDate: body.dischargeDate ? String(body.dischargeDate) : undefined,
    deptName: body.deptName ? String(body.deptName) : undefined,
    wardName: body.wardName ? String(body.wardName) : undefined,
    attendingDoctor: body.attendingDoctor ? String(body.attendingDoctor) : undefined,
    primaryDiagnosis: body.primaryDiagnosis ? String(body.primaryDiagnosis) : undefined,
    secondaryDiagnoses: body.secondaryDiagnoses ? body.secondaryDiagnoses as string[] : undefined,
    operationCodes: body.operationCodes ? body.operationCodes as string[] : undefined,
    operationNames: body.operationNames ? body.operationNames as string[] : undefined,
    icd10Codes: body.icd10Codes ? body.icd10Codes as string[] : undefined,
    totalCost: body.totalCost ? Number(body.totalCost) : undefined,
    insuranceType: body.insuranceType ? String(body.insuranceType) : undefined,
    dischargeStatus: body.dischargeStatus ? String(body.dischargeStatus) : undefined,
  });
}

export async function verifyView(view: AuthView, id: string) {
  if (!view.permissions.includes('medical_header:verify')) throw new MedicalHeaderError(403, '无审核权限');
  const r = await repo.verify(id, view.id);
  if (!r) throw new MedicalHeaderError(409, '仅已完成病历首页可审核');
  return r;
}
