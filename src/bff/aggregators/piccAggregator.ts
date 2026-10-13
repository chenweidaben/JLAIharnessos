/**
 * 健澜科技 jlmedaios - PICC 维护聚合器（M68-A）
 * 护士录入维护记录；complication 非 none 自动建 source='quality_safety' 管道并发症工单；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { getPatientById } from '../../db/repositories/patientRepo.js';
import {
  recordMaintenance, listByPatient, type PiccMaintenance,
} from '../../db/repositories/piccRepo.js';

export class PiccError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'PiccError';
  }
}
const notFound = (m: string) => new PiccError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new PiccError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new PiccError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function assertPatientScope(auth: AuthView, patientId: string) {
  const patient = await getPatientById(patientId);
  if (!patient) throw notFound('患者不存在');
  if (auth.dataScope !== 'all') throw forbidden('超出数据权限范围');
  return patient;
}

/** 录入维护记录。 */
export async function recordView(
  auth: AuthView,
  input: {
    patientId: string; deviceType: string; insertedAt: string; lastMaintainedAt: string;
    dressingChanged?: boolean; flushed?: boolean; complication?: string | null; notes?: string | null;
  },
): Promise<PiccMaintenance> {
  assertPermission(auth, 'picc:maintain');
  if (!UUID_RE.test(input.patientId.trim())) throw badRequest('患者标识非法');
  if (!input.deviceType) throw badRequest('装置类型不能为空');
  if (!input.insertedAt.trim()) throw badRequest('置管日期不能为空');
  if (!input.lastMaintainedAt.trim()) throw badRequest('上次维护日期不能为空');
  await assertPatientScope(auth, input.patientId.trim());
  return recordMaintenance({
    patientId: input.patientId.trim(),
    deviceType: input.deviceType,
    insertedAt: input.insertedAt.trim(),
    lastMaintainedAt: input.lastMaintainedAt.trim(),
    dressingChanged: Boolean(input.dressingChanged),
    flushed: Boolean(input.flushed),
    complication: input.complication ?? null,
    notes: input.notes ?? null,
    nurse: auth.id,
  });
}

/** 按患者列出。 */
export async function listView(auth: AuthView, patientId: string): Promise<PiccMaintenance[]> {
  assertPermission(auth, 'picc:view');
  if (!UUID_RE.test(patientId.trim())) throw badRequest('患者标识非法');
  await assertPatientScope(auth, patientId.trim());
  return listByPatient(patientId.trim());
}
