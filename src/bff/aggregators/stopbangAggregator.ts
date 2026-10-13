/**
 * 健澜科技 jlmedaios - STOP-BANG 睡眠呼吸暂停筛查聚合器（M59-A）
 *
 * 护士录入 8 项 -> 纯函数算分与风险；score>=3 自动建 source='quality_safety'
 * 睡眠监测会诊工单（幂等）。越权（数据范围外 visit）-> 403；无权限码 -> 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { withTx } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import {
  createScreening, listByVisit, type StopBangScreening,
} from '../../db/repositories/stopbangRepo.js';
import { calcScore, needsSleepStudy, riskLevel, type StopBangAnswers } from '../../medical-tools/nursing/stopbang.js';

export class StopBangError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'StopBangError';
  }
}
const notFound = (m: string) => new StopBangError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new StopBangError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new StopBangError(400, 'BAD_REQUEST', m);

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
  screening: StopBangScreening;
  workOrderCreated: boolean;
}

/** 录入 STOP-BANG 筛查。 */
export async function assessView(auth: AuthView, input: StopBangAnswers & { visitId: string }): Promise<AssessResult> {
  assertPermission(auth, 'stopbang:assess');
  const visitId = input.visitId.trim();
  if (!UUID_RE.test(visitId)) throw badRequest('就诊标识非法');
  await assertVisitScope(auth, visitId);

  const answers: StopBangAnswers = {
    sSnoring: Boolean(input.sSnoring),
    tTired: Boolean(input.tTired),
    oObserved: Boolean(input.oObserved),
    pPressure: Boolean(input.pPressure),
    bBmi: Boolean(input.bBmi),
    aAge: Boolean(input.aAge),
    nNeck: Boolean(input.nNeck),
    gGender: Boolean(input.gGender),
  };
  const score = calcScore(answers);
  const level = riskLevel(score);

  return withTx(async (tx) => {
    const screening = await createScreening({
      visitId, ...answers, score, riskLevel: level, assessor: auth.id,
    }, tx);

    let workOrderCreated = false;
    if (needsSleepStudy(score) && !(await hasOpenTask(visitId, 'quality_safety', tx))) {
      await createTask({
        source: 'quality_safety',
        visitId,
        title: '睡眠监测会诊',
        finding: `STOP-BANG score=${score} 高风险 需多导睡眠监测`,
        assigneeId: auth.id,
        createdBy: auth.id,
      }, tx);
      workOrderCreated = true;
    }
    return { screening, workOrderCreated };
  });
}

/** 按就诊列出筛查记录。 */
export async function listView(auth: AuthView, visitId: string): Promise<StopBangScreening[]> {
  assertPermission(auth, 'stopbang:view');
  if (!UUID_RE.test(visitId.trim())) throw badRequest('就诊标识非法');
  await assertVisitScope(auth, visitId.trim());
  return listByVisit(visitId.trim());
}
