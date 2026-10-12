/**
 * 健澜科技 jlmedaios - 整改效果回看聚合器（M22-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getTask } from '../../db/repositories/improvementTaskRepo.js';
import { getByTask, upsertReview } from '../../db/repositories/improvementOutcomeRepo.js';
import { createEscalatedTask, getLatestEscalation } from '../../db/repositories/escalationRepo.js';
import { judgeOutcome } from '../../medical-tools/operations/improvementOutcome.js';
import { shouldEscalate } from '../../medical-tools/operations/escalation.js';

export class ImprovementOutcomeError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ImprovementOutcomeError';
  }
}
const badRequest = (m: string) => new ImprovementOutcomeError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ImprovementOutcomeError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new ImprovementOutcomeError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView): void {
  if (!auth.permissions.includes('improvement_outcome:view')) throw forbidden('缺少权限：improvement_outcome:view');
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 对某 closed 整改单 evaluate：统计前后超支率 → 纯函数定 verdict → upsert。 */
export async function evaluateView(
  auth: AuthView,
  taskId: string,
  input: { baselineVisits?: number; baselineOverspendRate?: number; followupVisits?: number; followupOverspendRate?: number; followupReadmitRate?: number },
) {
  assertPermission(auth);
  if (!UUID_RE.test(taskId.trim())) throw notFound('整改单不存在');
  const task = await getTask(taskId);
  if (!task) throw notFound('整改单不存在');
  if (task.status !== 'closed') throw badRequest('仅 closed 整改单可效果回看');

  const baselineRate = input.baselineOverspendRate ?? 0;
  const followupRate = input.followupOverspendRate ?? 0;
  const verdict = judgeOutout(baselineRate, followupRate);
  const r = await upsertReview({
    taskId,
    baselineVisits: input.baselineVisits ?? 0,
    baselineOverspendRate: baselineRate,
    followupVisits: input.followupVisits ?? 0,
    followupOverspendRate: followupRate,
    followupReadmitRate: input.followupReadmitRate ?? 0,
    verdict,
  });
  await recordChainAudit(
    { actorId: auth.id, action: 'improvement_outcome.evaluate', resourceType: 'improvement_outcome_reviews', resourceId: r.id, result: 'success', riskLevel: 'low', detail: { taskId, verdict } },
  );

  // M22-F：verdict=worse/no_improvement → 自动建二级升级单（幂等：同 parent 只一条）
  let escalated = null;
  if (shouldEscalate(verdict)) {
    const existing = await getLatestEscalation(taskId);
    if (!existing) {
      escalated = await createEscalatedTask({
        parentTaskId: taskId,
        escalationLevel: 2,
        title: `[ESC] re-review after ${verdict}`,
        finding: `original task ${taskId} verdict=${verdict}`,
        assigneeId: auth.id, // 上级医师/科主任（复用当前操作用户为占位）
        createdBy: auth.id,
      });
      await recordChainAudit(
        { actorId: auth.id, action: 'improvement.escalate', resourceType: 'clinical_improvement_tasks', resourceId: escalated.id, result: 'success', riskLevel: 'high', detail: { parentTaskId: taskId, verdict } },
      );
    }
  }
  return { review: r, escalated };
}

function judgeOutout(b: number, f: number) {
  return judgeOutcome(b, f);
}

export async function getByTaskView(auth: AuthView, taskId: string) {
  assertPermission(auth);
  if (!UUID_RE.test(taskId.trim())) throw notFound('整改单不存在');
  return getByTask(taskId);
}
