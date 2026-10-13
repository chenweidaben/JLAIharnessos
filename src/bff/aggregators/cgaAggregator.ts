/**
 * 健澜科技 jlmedaios - 老年综合评估 CGA 聚合器（M56-A）
 *
 * 护士录入六维评分 -> 纯函数算 risk_level 与 flags；
 * high 自动建 source='quality_safety' 老年综合干预工单（幂等）。
 * 越权（数据范围外 visit）-> 403；无权限码 -> 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { withTx } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import {
  createAssessment, listByVisit, type CgaAssessment,
} from '../../db/repositories/cgaRepo.js';
import { flags, needsIntervention, riskLevel, type CgaInput } from '../../medical-tools/nursing/cga.js';

export class CgaError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'CgaError';
  }
}
const notFound = (m: string) => new CgaError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new CgaError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new CgaError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function assertVisitScope(auth: AuthView, visitId: string) {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');
  return visit;
}

export interface AssessResult {
  assessment: CgaAssessment;
  flags: string[];
  interventionWorkOrderCreated: boolean;
}

function clampInt(v: unknown, min: number, max: number, name: string): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw badRequest(`${name} 须在 ${min}~${max}`);
  return n;
}

/** 录入 CGA 评估。 */
export async function assessView(
  auth: AuthView,
  input: {
    visitId: string; adlScore: number; iadlScore: number; mmseScore: number;
    fallRisk?: boolean; mnaScore: number; gdsScore: number;
  },
): Promise<AssessResult> {
  assertPermission(auth, 'cga:assess');
  const visitId = input.visitId.trim();
  if (!UUID_RE.test(visitId)) throw badRequest('就诊标识非法');
  await assertVisitScope(auth, visitId);

  const cga: CgaInput = {
    adlScore: clampInt(input.adlScore, 0, 100, 'ADL'),
    iadlScore: clampInt(input.iadlScore, 0, 28, 'IADL'),
    mmseScore: clampInt(input.mmseScore, 0, 30, 'MMSE'),
    fallRisk: Boolean(input.fallRisk),
    mnaScore: clampInt(input.mnaScore, 0, 14, 'MNA'),
    gdsScore: clampInt(input.gdsScore, 0, 15, 'GDS'),
  };
  const level = riskLevel(cga);
  const fl = flags(cga);

  return withTx(async (tx) => {
    const assessment = await createAssessment({
      visitId,
      adlScore: cga.adlScore,
      iadlScore: cga.iadlScore,
      mmseScore: cga.mmseScore,
      fallRisk: cga.fallRisk,
      mnaScore: cga.mnaScore,
      gdsScore: cga.gdsScore,
      riskLevel: level,
      assessor: auth.id,
    }, tx);

    let interventionWorkOrderCreated = false;
    if (needsIntervention(cga) && !(await hasOpenTask(visitId, 'quality_safety', tx))) {
      await createTask({
        source: 'quality_safety',
        visitId,
        title: '老年综合干预',
        finding: `CGA risk_level=${level} flags=${fl.join(',')} 需多学科干预`,
        assigneeId: auth.id,
        createdBy: auth.id,
      }, tx);
      interventionWorkOrderCreated = true;
    }
    return { assessment, flags: fl, interventionWorkOrderCreated };
  });
}

/** 按就诊列出评估。 */
export async function listView(auth: AuthView, visitId: string): Promise<CgaAssessment[]> {
  assertPermission(auth, 'cga:view');
  if (!UUID_RE.test(visitId.trim())) throw badRequest('就诊标识非法');
  await assertVisitScope(auth, visitId.trim());
  return listByVisit(visitId.trim());
}
