import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/nursingRecordRepo';

export class NursingRecordError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('nursing_record:view')) throw new NursingRecordError(403, '无查看权限');
  if (!visitId) throw new NursingRecordError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('nursing_record:write')) throw new NursingRecordError(403, '无书写权限');
  if (!body.visitId) throw new NursingRecordError(400, 'visitId 必填');
  return repo.create({
    visitId: String(body.visitId), recordType: String(body.recordType ?? 'general'),
    temperature: body.temperature ? Number(body.temperature) : undefined,
    pulse: body.pulse ? Number(body.pulse) : undefined,
    respiration: body.respiration ? Number(body.respiration) : undefined,
    bpSystolic: body.bpSystolic ? Number(body.bpSystolic) : undefined,
    bpDiastolic: body.bpDiastolic ? Number(body.bpDiastolic) : undefined,
    oxygenSaturation: body.oxygenSaturation ? Number(body.oxygenSaturation) : undefined,
    intakeMl: body.intakeMl ? Number(body.intakeMl) : undefined,
    outputMl: body.outputMl ? Number(body.outputMl) : undefined,
    content: body.content ? String(body.content) : undefined,
    recordedBy: view.id,
  });
}
