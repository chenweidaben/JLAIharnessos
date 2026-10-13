/**
 * 健澜科技 jlmedaios - 输血反应聚合器（M71-A）
 * 护士报告反应；severe/溶血 自动建 source='quality_safety' 工单并 blocked=true；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { getPatientById } from '../../db/repositories/patientRepo.js';
import {
  listByPatient, reportReaction, type TransfusionReaction,
} from '../../db/repositories/transfusionReactionRepo.js';
import {
  createTask,
} from '../../db/repositories/improvementTaskRepo.js';
import { blocksFutureTransfusion, type ReactionSeverity, type ReactionType } from '../../medical-tools/nursing/transfusionReaction.js';

export class TransfusionError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'TransfusionError';
  }
}
const notFound = (m: string) => new TransfusionError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new TransfusionError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new TransfusionError(400, 'BAD_REQUEST', m);

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

const ALLOWED_TYPES: ReactionType[] = ['fever', 'allergy', 'hemolysis', 'taco', 'other'];
const ALLOWED_SEV: ReactionSeverity[] = ['mild', 'moderate', 'severe'];

/** 报告输血反应。 */
export async function reportView(
  auth: AuthView,
  input: {
    patientId: string; transfusionId?: string | null;
    reactionType: string; severity: string; symptoms: string;
  },
): Promise<TransfusionReaction> {
  assertPermission(auth, 'transfusion:report');
  if (!UUID_RE.test(input.patientId.trim())) throw badRequest('患者标识非法');
  const reactionType = input.reactionType.trim() as ReactionType;
  const severity = input.severity.trim() as ReactionSeverity;
  if (!ALLOWED_TYPES.includes(reactionType)) throw badRequest('反应类型非法');
  if (!ALLOWED_SEV.includes(severity)) throw badRequest('严重度非法');
  if (!input.symptoms.trim()) throw badRequest('症状不能为空');
  await assertPatientScope(auth, input.patientId.trim());

  const blocked = blocksFutureTransfusion(reactionType, severity);
  const rec = await reportReaction({
    patientId: input.patientId.trim(),
    transfusionId: input.transfusionId ?? null,
    reactionType,
    severity,
    symptoms: input.symptoms.trim(),
    blocked,
    reportedBy: auth.id,
  });

  if (blocked) {
    await createTask({
      source: 'quality_safety',
      category: 'transfusion',
      title: '输血不良反应需调查',
      finding: `患者 ${input.patientId.trim()} 报告类型=${reactionType}，严重度=${severity}，已阻断后续输血`,
      assigneeId: auth.id,
      createdBy: auth.id,
    });
  }
  return rec;
}

/** 按患者列出。 */
export async function listView(auth: AuthView, patientId: string): Promise<TransfusionReaction[]> {
  assertPermission(auth, 'transfusion:view');
  if (!UUID_RE.test(patientId.trim())) throw badRequest('患者标识非法');
  await assertPatientScope(auth, patientId.trim());
  return listByPatient(patientId.trim());
}
