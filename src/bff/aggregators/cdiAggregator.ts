/**
 * 健澜科技 jlmedaios - CDI 用药审查聚合器（M70-A）
 * 医生开处方/医嘱时调用纯函数审查；severity=block 自动拦截并记录；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { getPatientById } from '../../db/repositories/patientRepo.js';
import {
  recordReview, listByPatient, resolveReview, type CdiReview,
} from '../../db/repositories/cdiRepo.js';
import { checkAllergy, checkDose, checkInteraction, worseSeverity, type Severity } from '../../medical-tools/nursing/cdi.js';

export class CdiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'CdiError';
  }
}
const notFound = (m: string) => new CdiError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new CdiError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new CdiError(400, 'BAD_REQUEST', m);

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

/** 执行用药审查并落库。 */
export async function reviewView(
  auth: AuthView,
  input: {
    patientId: string; visitId?: string | null; drugName: string;
    currentDrugs?: string[]; allergies?: string[]; doseMg?: number; weightKg?: number;
  },
): Promise<CdiReview> {
  assertPermission(auth, 'cdi:review');
  if (!UUID_RE.test(input.patientId.trim())) throw badRequest('患者标识非法');
  if (!input.drugName.trim()) throw badRequest('药物名称不能为空');
  await assertPatientScope(auth, input.patientId.trim());

  const current = input.currentDrugs ?? [];
  const allergies = input.allergies ?? [];
  let sev: Severity = 'info';
  const msgs: string[] = [];

  const ix = checkInteraction(input.drugName, current);
  if (ix !== 'info') { sev = worseSeverity(sev, ix); msgs.push(`相互作用：${input.drugName} 与在用药相互作用`); }
  const al = checkAllergy(input.drugName, allergies);
  if (al !== 'info') { sev = worseSeverity(sev, al); msgs.push(`过敏：患者对 ${input.drugName} 过敏`); }
  if (input.doseMg != null && input.weightKg != null) {
    const d = checkDose(input.drugName, input.doseMg, input.weightKg);
    if (d !== 'info') { sev = worseSeverity(sev, d); msgs.push(`剂量：${input.doseMg}mg / ${input.weightKg}kg 需复核`); }
  }

  const reviewType = al !== 'info' ? 'allergy' : ix !== 'info' ? 'interaction' : (input.doseMg != null ? 'dose' : 'interaction');
  return recordReview({
    patientId: input.patientId.trim(),
    visitId: input.visitId ?? null,
    drugName: input.drugName.trim(),
    reviewType,
    severity: sev,
    message: msgs.length ? msgs.join('；') : '未发现用药风险',
    reviewedBy: auth.id,
  });
}

/** 按患者列出。 */
export async function listView(auth: AuthView, patientId: string): Promise<CdiReview[]> {
  assertPermission(auth, 'cdi:view');
  if (!UUID_RE.test(patientId.trim())) throw badRequest('患者标识非法');
  await assertPatientScope(auth, patientId.trim());
  return listByPatient(patientId.trim());
}

/** 标记已处理。 */
export async function resolveView(auth: AuthView, id: string): Promise<CdiReview> {
  assertPermission(auth, 'cdi:review');
  if (!UUID_RE.test(id.trim())) throw badRequest('审查记录标识非法');
  return resolveReview(id.trim());
}
