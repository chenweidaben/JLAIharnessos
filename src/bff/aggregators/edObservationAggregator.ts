/**
 * 健澜科技 jlmedaios - 急诊留观聚合器（M74-A）
 * 急诊登记留观；observing 且 >24h 自动建 source='er_green' 滞留预警工单（幂等）；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { getPatientById } from '../../db/repositories/patientRepo.js';
import {
  closeObservation, listActive, listByPatient, registerObservation, type EdObservation,
} from '../../db/repositories/edObservationRepo.js';
import { createTask } from '../../db/repositories/improvementTaskRepo.js';
import { durationHours, needsAlert } from '../../medical-tools/nursing/edObservation.js';

export class EdObsError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'EdObsError';
  }
}
const notFound = (m: string) => new EdObsError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new EdObsError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new EdObsError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRIAGE = ['I', 'II', 'III', 'IV', 'V'];
const DISPOSITION = ['admitted', 'discharged', 'transferred', 'left_ama'];

async function assertPatientScope(auth: AuthView, patientId: string) {
  const patient = await getPatientById(patientId);
  if (!patient) throw notFound('患者不存在');
  if (auth.dataScope !== 'all') throw forbidden('超出数据权限范围');
  return patient;
}

/** 登记留观。登记后即评估是否滞留告警。 */
export async function registerView(
  auth: AuthView,
  input: { patientId: string; triageLevel: string },
): Promise<EdObservation> {
  assertPermission(auth, 'ed_obs:register');
  if (!UUID_RE.test(input.patientId.trim())) throw badRequest('患者标识非法');
  if (!TRIAGE.includes(input.triageLevel.trim())) throw badRequest('分诊分级非法');
  await assertPatientScope(auth, input.patientId.trim());
  const rec = await registerObservation({
    patientId: input.patientId.trim(),
    triageLevel: input.triageLevel.trim(),
    registeredBy: auth.id,
  });
  if (needsAlert(durationHours(rec.enteredAt, rec.dischargedAt), rec.status)) {
    await createTask({
      source: 'er_green',
      category: 'ed_observation',
      title: '急诊留观滞留 >24h',
      finding: `患者 ${input.patientId.trim()} 分诊=${rec.triageLevel}，已留观超过 24 小时需尽快处置`,
      assigneeId: auth.id,
      createdBy: auth.id,
    });
  }
  return rec;
}

/** 关闭留观。 */
export async function closeView(auth: AuthView, id: string, disposition: string): Promise<EdObservation> {
  assertPermission(auth, 'ed_obs:register');
  if (!UUID_RE.test(id.trim())) throw badRequest('留观标识非法');
  if (!DISPOSITION.includes(disposition)) throw badRequest('转归非法');
  const rec = await closeObservation(id.trim(), disposition);
  if (!rec) throw notFound('留观记录不存在或已关闭');
  return rec;
}

/** 列表：按 status=observing 取活跃，或按 patientId 取患者记录。 */
export async function listView(auth: AuthView, params: { status?: string; patientId?: string }): Promise<EdObservation[]> {
  assertPermission(auth, 'ed_obs:view');
  if (params.patientId) {
    if (!UUID_RE.test(params.patientId.trim())) throw badRequest('患者标识非法');
    await assertPatientScope(auth, params.patientId.trim());
    return listByPatient(params.patientId.trim());
  }
  if (auth.dataScope !== 'all') throw forbidden('超出数据权限范围');
  return listActive();
}
