import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/surgeryRecordRepo';

export class SurgeryRecordError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listView(view: AuthView, visitId: string) {
  if (!visitId) throw new SurgeryRecordError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('surgery_record:write')) throw new SurgeryRecordError(403, '无书写权限');
  if (!body.visitId) throw new SurgeryRecordError(400, 'visitId 必填');
  if (!body.surgeryName) throw new SurgeryRecordError(400, '手术名称必填');
  if (!body.surgeryDate) throw new SurgeryRecordError(400, '手术日期必填');
  return repo.create({
    visitId: String(body.visitId), surgeryName: String(body.surgeryName),
    surgeryDate: String(body.surgeryDate), surgeon: view.id,
    assistant1: body.assistant1 ? String(body.assistant1) : undefined,
    assistant2: body.assistant2 ? String(body.assistant2) : undefined,
    anesthesiologist: body.anesthesiologist ? String(body.anesthesiologist) : undefined,
    incisionType: body.incisionType ? String(body.incisionType) : undefined,
    diagnosisBefore: body.diagnosisBefore ? String(body.diagnosisBefore) : undefined,
    diagnosisAfter: body.diagnosisAfter ? String(body.diagnosisAfter) : undefined,
    procedureDetail: body.procedureDetail ? String(body.procedureDetail) : undefined,
    bloodLoss: body.bloodLoss ? Number(body.bloodLoss) : undefined,
    bloodTransfusion: body.bloodTransfusion ? Number(body.bloodTransfusion) : undefined,
    complications: body.complications ? String(body.complications) : undefined,
  });
}

export async function signView(view: AuthView, id: string) {
  if (!view.permissions.includes('surgery_record:sign')) throw new SurgeryRecordError(403, '无签名权限');
  const r = await repo.sign(id, view.id);
  if (!r) throw new SurgeryRecordError(409, '仅已完成手术记录可签名');
  return r;
}
