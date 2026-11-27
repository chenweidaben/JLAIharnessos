import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/medicalHeaderRepo';
import { toText } from '../../db/rowText.js';


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
    visitId: toText(body.visitId), patientName: toText(body.patientName),
    admissionDate: toText(body.admissionDate),
    gender: body.gender ? toText(body.gender) : undefined,
    birthDate: body.birthDate ? toText(body.birthDate) : undefined,
    idCard: body.idCard ? toText(body.idCard) : undefined,
    dischargeDate: body.dischargeDate ? toText(body.dischargeDate) : undefined,
    deptName: body.deptName ? toText(body.deptName) : undefined,
    wardName: body.wardName ? toText(body.wardName) : undefined,
    attendingDoctor: body.attendingDoctor ? toText(body.attendingDoctor) : undefined,
    primaryDiagnosis: body.primaryDiagnosis ? toText(body.primaryDiagnosis) : undefined,
    secondaryDiagnoses: body.secondaryDiagnoses ? body.secondaryDiagnoses as string[] : undefined,
    operationCodes: body.operationCodes ? body.operationCodes as string[] : undefined,
    operationNames: body.operationNames ? body.operationNames as string[] : undefined,
    icd10Codes: body.icd10Codes ? body.icd10Codes as string[] : undefined,
    totalCost: body.totalCost ? Number(body.totalCost) : undefined,
    insuranceType: body.insuranceType ? toText(body.insuranceType) : undefined,
    dischargeStatus: body.dischargeStatus ? toText(body.dischargeStatus) : undefined,
  });
}

export async function verifyView(view: AuthView, id: string) {
  if (!view.permissions.includes('medical_header:verify')) throw new MedicalHeaderError(403, '无审核权限');
  const r = await repo.verify(id, view.id);
  if (!r) throw new MedicalHeaderError(409, '仅已完成病历首页可审核');
  return r;
}
