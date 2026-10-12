/**
 * 健澜科技 jlmedaios - 续方流转聚合器（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { canRenew, nextStatus } from '../../medical-tools/internet/renewalFlow.js';
import { nextTaskStatus, shouldCreateTask } from '../../medical-tools/internet/dispenseTask.js';
import { completeTask, createTask, listPending, getTaskById } from '../../db/repositories/pharmacyTaskRepo.js';
import { createNotification } from '../../db/repositories/patientNotificationRepo.js';
import {
  createRenewalPrescription,
  getRenewalById,
  listByPatient,
  transitionStatus,
  type RenewalRow,
} from '../../db/repositories/renewalFlowRepo.js';

export class RenewalError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'RenewalError';
  }
}
const badRequest = (m: string) => new RenewalError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new RenewalError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new RenewalError(409, 'CONFLICT', m);
const forbidden = (m: string) => new RenewalError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 医生对已 completed 会话发起续方。 */
export async function prescribeView(
  auth: AuthView,
  input: { sessionId: string; patientId: string; accountId: string; profileId: string; department?: string | null; rxNo: string; idempotencyKey: string; priorRxId?: string | null; totalFee?: number | null; sessionStatus?: string; hasPriorRx?: boolean },
): Promise<RenewalRow> {
  assertPermission(auth, 'renewal:prescribe');
  if (!UUID_RE.test(input.sessionId.trim())) throw badRequest('会话 ID 非法');
  if (!canRenew({ sessionStatus: input.sessionStatus ?? 'completed', hasPriorRx: input.hasPriorRx ?? true })) {
    throw badRequest('会话未完成或无既往处方，不可续方');
  }
  return withTx(async (tx) => {
    const r = await createRenewalPrescription({ ...input, prescriberId: auth.id }, tx);
    await recordChainAudit(
      { actorId: auth.id, action: 'renewal.prescribe', resourceType: 'internet_prescription', resourceId: r.id, result: 'success', riskLevel: 'medium', detail: { rxNo: r.rxNo, sessionId: input.sessionId } },
      tx,
    );
    return r;
  });
}

/** 患者列自己续方处方。 */
export async function listMineView(auth: AuthView, patientId: string) {
  if (!UUID_RE.test(patientId.trim())) throw badRequest('患者 ID 非法');
  return listByPatient(patientId);
}

/** 患者支付：approved → paid，同事务建配药任务+患者通知。 */
export async function payView(auth: AuthView, rxId: string): Promise<RenewalRow> {
  assertPermission(auth, 'renewal:pay');
  if (!UUID_RE.test(rxId.trim())) throw notFound('处方不存在');
  const before = await getRenewalById(rxId);
  if (!before) throw notFound('处方不存在');
  const next = nextStatus(before.status, 'pay');
  if (!next) throw conflict(`状态 ${before.status} 不可支付`);
  if (!shouldCreateTask('paid', before.status)) throw conflict('当前状态不应触发配药任务');
  return withTx(async (tx) => {
    const r = await transitionStatus(rxId, before.status, next, tx);
    if (!r) throw conflict('状态已变更');
    await createTask({ prescriptionId: rxId, patientId: before.patientId }, tx);
    await createNotification({
      patientId: before.patientId, notifType: 'critical',
      title: '处方已支付', body: `处方 ${before.rxNo} 已支付，待药房配药`,
      refType: 'prescription', refId: rxId,
    }, tx);
    await recordChainAudit(
      { actorId: auth.id, action: 'renewal.pay', resourceType: 'internet_prescription', resourceId: rxId, result: 'success', riskLevel: 'low', detail: { from: before.status, to: next, task: 'created' } },
      tx,
    );
    return r;
  });
}

/** 药师完成配药任务：任务 completed + 处方 ready_dispense。 */
export async function completeTaskView(auth: AuthView, taskId: string): Promise<{ task: unknown; prescription: RenewalRow }> {
  if (!auth.permissions.includes('pharmacy:dispense')) throw forbidden('缺少权限：pharmacy:dispense');
  if (!UUID_RE.test(taskId.trim())) throw notFound('任务不存在');
  const task = await getTaskById(taskId);
  if (!task) throw notFound('任务不存在');
  const next = nextTaskStatus(task.status, 'complete');
  if (!next) throw conflict(`任务状态 ${task.status} 不可完成`);
  return withTx(async (tx) => {
    const done = await completeTask(taskId, auth.id, tx);
    if (!done) throw conflict('任务已变更');
    const rx = await transitionStatus(task.prescriptionId, 'paid', 'ready_dispense', tx);
    if (!rx) throw conflict('处方状态已变更');
    await recordChainAudit(
      { actorId: auth.id, action: 'pharmacy.complete', resourceType: 'pharmacy_dispense_task', resourceId: taskId, result: 'success', riskLevel: 'low', detail: { prescriptionId: task.prescriptionId } },
      tx,
    );
    return { task: done, prescription: rx };
  });
}

export async function listPendingTasksView(auth: AuthView) {
  if (!auth.permissions.includes('pharmacy:dispense')) throw forbidden('缺少权限：pharmacy:dispense');
  return listPending();
}

/** 药师配药：paid → ready_dispense。 */
export async function dispenseView(auth: AuthView, rxId: string): Promise<RenewalRow> {
  if (!UUID_RE.test(rxId.trim())) throw notFound('处方不存在');
  const before = await getRenewalById(rxId);
  if (!before) throw notFound('处方不存在');
  const next = nextStatus(before.status, 'dispense');
  if (!next) throw conflict(`状态 ${before.status} 不可配药`);
  return withTx(async (tx) => {
    const r = await transitionStatus(rxId, before.status, next, tx);
    if (!r) throw conflict('状态已变更');
    await recordChainAudit(
      { actorId: auth.id, action: 'renewal.dispense', resourceType: 'internet_prescription', resourceId: rxId, result: 'success', riskLevel: 'low', detail: { from: before.status, to: next } },
      tx,
    );
    return r;
  });
}
