/**
 * 健澜科技 jlmedaios - 住院在院诊疗日常聚合器（M1-B2）
 *
 * 真实落 PostgreSQL，去 mock。实现三大在院日常状态机：
 *
 *  医生查房：  createRound(draft) ──sign(本人签名)──► signed
 *                上级查房 is_superior ──countersign(上级医师审签)──► countersigned
 *                （return 退回附因）
 *  护士护理：  createNursingRecord(draft) ──sign(本人签名)──► signed
 *              createTask(pending) ──execute(CAS+幂等键)──► done
 *  在院医嘱：  createOrder(pending_review) ──review(医师审核)──► active
 *                active ──administer(护士执行/双人核对)──► order_administrations
 *                临时医嘱单次执行后 executed；长期医嘱 stop(医师停止)──► stopped
 *
 * 医疗级严谨（职责分离，角色判定 + 权限码双重保障）：
 *  - 医生：查房记录、医嘱开具/审核/停止；护士：护理记录、护理任务、医嘱执行、双人核对；
 *  - 护士审签查房 / 审核医嘱 / 停止医嘱 → 403；医生执行护理任务/医嘱给药 → 403；
 *  - 所有临床文书必须本人签名（Repository CAS 强制 author/nurse == signer），AI 仅辅助、不得代签；
 *  - 每次写操作同事务写 audit.audit_logs 哈希链。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, type DbExecutor } from '../../db/pool.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  countersignWardRound,
  createWardRound,
  listWardRoundsByVisit,
  returnWardRound,
  signWardRound,
  type WardRound,
  type WardRoundInput,
} from '../../db/repositories/wardRoundRepo.js';
import {
  createNursingRecord,
  createNursingTask,
  executeNursingTask,
  listNursingRecordsByVisit,
  listNursingTasksByVisit,
  signNursingRecord,
  isUniqueViolation,
  type NursingRecord,
  type NursingRecordInput,
  type NursingTask,
  type NursingTaskInput,
} from '../../db/repositories/nursingRepo.js';
import {
  createInpatientOrder,
  getOrderById,
  getOrdersByVisit,
  markOrderExecuted,
  rejectOrder as repoRejectOrder,
  reviewOrder as repoReviewOrder,
  stopOrder as repoStopOrder,
  type Order,
  type OrderCategory,
  type OrderType,
  type OrderPriority,
} from '../../db/repositories/orderRepo.js';
import {
  insertAdministrationOnce,
  listAdministrationsByOrder,
  type Administration,
} from '../../db/repositories/orderAdministrationRepo.js';

/* ------------------------------ 错误类型 ------------------------------- */

export class CareError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CareError';
  }
}
const badRequest = (m: string) => new CareError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new CareError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new CareError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new CareError(409, 'CONFLICT', m);

/* --------------------------- 角色 / 范围判定 ---------------------------- */

/** 是否具备医师角色（admin 放行以作运维兜底） */
export function isDoctor(auth: AuthView): boolean {
  return auth.rawRoles.includes('doctor') || auth.rawRoles.includes('admin');
}

/** 是否具备护士角色（admin 放行） */
export function isNurse(auth: AuthView): boolean {
  return auth.rawRoles.includes('nurse') || auth.rawRoles.includes('admin');
}

/** 仅医师（用于审核/停止等护士明确禁止的动作；admin 仍放行） */
function requireDoctor(auth: AuthView, action: string): void {
  if (!isDoctor(auth)) throw forbidden(`${action}：仅医师可操作，护士无此权限`);
}

/** 仅护士（用于护理记录/任务/医嘱执行） */
function requireNurse(auth: AuthView, action: string): void {
  if (!isNurse(auth)) throw forbidden(`${action}：仅护士可操作，医师无此权限`);
}

/**
 * 在院患者访问范围：
 *  all 全开放；dept/group 限本科室；self 限本人经治。
 */
export function canAccessVisit(
  auth: AuthView,
  visit: { department: string; attendingDoctorId: string | null },
): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return visit.department === auth.deptName;
  }
  if (auth.dataScope === 'self') return visit.attendingDoctorId === auth.id;
  return false;
}

/** 加载并校验在院住院就诊（含数据范围）。 */
async function loadInpatientVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const visit = await getVisitById(visitId);
  if (!visit || visit.visitType !== 'inpatient' || visit.status !== 'ongoing') {
    throw notFound('在院住院就诊不存在或已结束');
  }
  if (!canAccessVisit(auth, visit)) {
    throw forbidden('超出数据权限范围，无法操作该患者');
  }
  return visit;
}

/** 生成执行时点标识（长期医嘱按小时槽，保证同小时不重复）。 */
export function defaultSlot(now: Date = new Date()): string {
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `${ymd}T${String(now.getHours()).padStart(2, '0')}:00`;
}

/** 由执行人生成确定性幂等键（同一执行人同一时点同一医嘱只成功一次）。 */
export function buildIdempotencyKey(orderId: string, slot: string, actorId: string): string {
  return `${orderId}:${slot}:${actorId}`;
}

/* ============================== 医生查房 =============================== */

export async function createRound(
  auth: AuthView, input: Omit<WardRoundInput, 'authorId'>,
): Promise<WardRound> {
  requireDoctor(auth, '创建查房记录');
  if (!input.assessment?.trim()) throw badRequest('病情评估不能为空');
  const visit = await loadInpatientVisit(auth, input.visitId);

  const db = getDb();
  return db.begin(async (tx) => {
    const round = await createWardRound(
      { ...input, patientId: visit.patientId, authorId: auth.id },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'ward_round.create', resourceType: 'ward_round', resourceId: round.id,
        patientRef: round.patientId, visitRef: round.visitId, result: 'success',
        detail: { roundNo: round.roundNo, roundType: round.roundType, isSuperior: round.isSuperior },
      },
      tx,
    );
    return round;
  });
}

export async function signRound(auth: AuthView, roundId: string): Promise<WardRound> {
  requireDoctor(auth, '查房记录签名');
  const db = getDb();
  return db.begin(async (tx) => {
    const round = await signWardRound(roundId, auth.id, tx);
    if (!round) {
      // 区分：不存在 / 非本人 / 非草稿，给出明确错误，不假成功
      const existing = await getRoundOrNull(roundId, tx);
      if (!existing) throw notFound('查房记录不存在');
      if (existing.authorId !== auth.id) throw forbidden('查房记录须本人签名，不得代签');
      throw conflict(`当前状态 ${existing.status} 不可签名`);
    }
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'ward_round.sign', resourceType: 'ward_round', resourceId: round.id,
        patientRef: round.patientId, visitRef: round.visitId, result: 'success',
        detail: { roundNo: round.roundNo },
      },
      tx,
    );
    return round;
  });
}

export async function countersignRound(auth: AuthView, roundId: string): Promise<WardRound> {
  requireDoctor(auth, '上级审签查房记录');
  const db = getDb();
  return db.begin(async (tx) => {
    const round = await countersignWardRound(roundId, auth.id, tx);
    if (!round) {
      const existing = await getRoundOrNull(roundId, tx);
      if (!existing) throw notFound('查房记录不存在');
      if (!existing.isSuperior) throw badRequest('仅上级查房记录需审签');
      if (existing.authorId === auth.id) throw forbidden('审签须由上级/第二医师完成，不得自审');
      throw conflict(`当前状态 ${existing.status} 不可审签`);
    }
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'ward_round.countersign', resourceType: 'ward_round', resourceId: round.id,
        patientRef: round.patientId, visitRef: round.visitId, result: 'success',
        detail: { roundNo: round.roundNo },
      },
      tx,
    );
    return round;
  });
}

export async function returnRound(
  auth: AuthView, roundId: string, reason: string,
): Promise<WardRound> {
  requireDoctor(auth, '退回查房记录');
  if (!reason?.trim()) throw badRequest('退回原因不能为空');
  const db = getDb();
  return db.begin(async (tx) => {
    const round = await returnWardRound(roundId, auth.id, reason, tx);
    if (!round) {
      const existing = await getRoundOrNull(roundId, tx);
      if (!existing) throw notFound('查房记录不存在');
      throw conflict(`当前状态 ${existing.status} 不可退回`);
    }
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'ward_round.return', resourceType: 'ward_round', resourceId: round.id,
        patientRef: round.patientId, visitRef: round.visitId, result: 'success',
        detail: { roundNo: round.roundNo, reason },
      },
      tx,
    );
    return round;
  });
}

export async function listRounds(auth: AuthView, visitId: string): Promise<WardRound[]> {
  await loadInpatientVisit(auth, visitId);
  return listWardRoundsByVisit(visitId);
}

async function getRoundOrNull(id: string, tx: DbExecutor): Promise<WardRound | null> {
  const rows = await tx`
    SELECT id, status, author_id, is_superior FROM clinical.ward_rounds WHERE id = ${id}
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    status: String(r.status), authorId: r.author_id ? String(r.author_id) : null,
    isSuperior: Boolean(r.is_superior),
  } as unknown as WardRound;
}

/* ============================== 护士护理 =============================== */

export async function createNursingCareRecord(
  auth: AuthView, input: Omit<NursingRecordInput, 'nurseId'>,
): Promise<NursingRecord> {
  requireNurse(auth, '创建护理记录');
  if (!input.nursingLevel) throw badRequest('护理级别不能为空');
  const visit = await loadInpatientVisit(auth, input.visitId);

  const db = getDb();
  return db.begin(async (tx) => {
    const record = await createNursingRecord(
      { ...input, patientId: visit.patientId, nurseId: auth.id },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'nursing.record_create', resourceType: 'nursing_record', resourceId: record.id,
        patientRef: record.patientId, visitRef: record.visitId, result: 'success',
        detail: { recordNo: record.recordNo, nursingLevel: record.nursingLevel },
      },
      tx,
    );
    return record;
  });
}

export async function signNursingCareRecord(
  auth: AuthView, recordId: string,
): Promise<NursingRecord> {
  requireNurse(auth, '护理记录签名');
  const db = getDb();
  return db.begin(async (tx) => {
    const record = await signNursingRecord(recordId, auth.id, tx);
    if (!record) {
      const rows = await tx`
        SELECT status, nurse_id FROM clinical.nursing_records WHERE id = ${recordId}
      `;
      if (rows.length === 0) throw notFound('护理记录不存在');
      const r = rows[0] as Record<string, unknown>;
      if (r.nurse_id !== auth.id) throw forbidden('护理记录须本人签名，不得代签');
      throw conflict(`当前状态 ${String(r.status)} 不可签名`);
    }
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'nursing.record_sign', resourceType: 'nursing_record', resourceId: record.id,
        patientRef: record.patientId, visitRef: record.visitId, result: 'success',
        detail: { recordNo: record.recordNo },
      },
      tx,
    );
    return record;
  });
}

export async function listNursingCareRecords(
  auth: AuthView, visitId: string,
): Promise<NursingRecord[]> {
  await loadInpatientVisit(auth, visitId);
  return listNursingRecordsByVisit(visitId);
}

export async function createCareTask(
  auth: AuthView, input: Omit<NursingTaskInput, never>,
): Promise<NursingTask> {
  requireNurse(auth, '创建护理任务');
  if (!input.content?.trim()) throw badRequest('任务内容不能为空');
  if (!input.idempotencyKey?.trim()) throw badRequest('缺少幂等键 idempotencyKey');
  const visit = await loadInpatientVisit(auth, input.visitId);

  const db = getDb();
  return db.begin(async (tx) => {
    let task: NursingTask;
    try {
      task = await createNursingTask({ ...input, patientId: visit.patientId }, tx);
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict('护理任务已存在（幂等键重复）');
      throw err;
    }
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'nursing.task_create', resourceType: 'nursing_task', resourceId: task.id,
        patientRef: task.patientId, visitRef: task.visitId, result: 'success',
        detail: { taskNo: task.taskNo, taskType: task.taskType },
      },
      tx,
    );
    return task;
  });
}

export interface TaskExecutionResult {
  task: NursingTask;
  /** 并发重复执行时为 true（任务已被他人执行，本次幂等返回，不产生第二条） */
  deduplicated: boolean;
}

export async function executeCareTask(
  auth: AuthView, taskId: string, resultText?: string,
): Promise<TaskExecutionResult> {
  requireNurse(auth, '执行护理任务');
  const db = getDb();
  return db.begin(async (tx) => {
    const task = await executeNursingTask(taskId, auth.id, resultText ?? null, tx);
    if (!task) {
      const rows = await tx`
        SELECT status FROM clinical.nursing_tasks WHERE id = ${taskId}
      `;
      if (rows.length === 0) throw notFound('护理任务不存在');
      const existing = rows[0] as Record<string, unknown>;
      if (existing.status === 'cancelled') throw conflict('任务已取消，不能执行');
      // pending 之外（done）→ 并发下已被执行，幂等返回既有任务
      const full = await tx`
        SELECT * FROM clinical.nursing_tasks WHERE id = ${taskId}
      `;
      const dedup = mapPlainTask(full[0] as Record<string, unknown>);
      await recordChainAudit(
        {
          actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
          action: 'nursing.task_execute_dedup', resourceType: 'nursing_task', resourceId: taskId,
          result: 'success', detail: { deduplicated: true },
        },
        tx,
      );
      return { task: dedup, deduplicated: true };
    }
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'nursing.task_execute', resourceType: 'nursing_task', resourceId: task.id,
        patientRef: task.patientId, visitRef: task.visitId, result: 'success',
        detail: { taskNo: task.taskNo },
      },
      tx,
    );
    return { task, deduplicated: false };
  });
}

export async function listCareTasks(auth: AuthView, visitId: string): Promise<NursingTask[]> {
  await loadInpatientVisit(auth, visitId);
  return listNursingTasksByVisit(visitId);
}

function mapPlainTask(row: Record<string, unknown>): NursingTask {
  return {
    id: String(row.id), visitId: String(row.visit_id), patientId: String(row.patient_id),
    taskNo: String(row.task_no), taskType: row.task_type as NursingTask['taskType'],
    content: String(row.content), scheduledAt: String(row.scheduled_at),
    status: row.status as NursingTask['status'], idempotencyKey: String(row.idempotency_key),
    result: row.result ? String(row.result) : null,
    executedBy: row.executed_by ? String(row.executed_by) : null,
    executedAt: row.executed_at ? String(row.executed_at) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

/* ============================== 在院医嘱 =============================== */

export interface InpatientOrderInput {
  visitId: string;
  orderType: OrderType;
  content: string;
  detail?: Record<string, unknown>;
  priority?: OrderPriority;
  category?: OrderCategory;
  requiresDoubleCheck?: boolean;
}

export async function createInpatientCareOrder(
  auth: AuthView, input: InpatientOrderInput,
): Promise<Order> {
  requireDoctor(auth, '开具住院医嘱');
  if (!input.content?.trim()) throw badRequest('医嘱内容不能为空');
  await loadInpatientVisit(auth, input.visitId);

  const db = getDb();
  return db.begin(async (tx) => {
    const order = await createInpatientOrder(
      {
        visitId: input.visitId, orderType: input.orderType, content: input.content,
        detail: input.detail, priority: input.priority, category: input.category,
        doctorId: auth.id, requiresDoubleCheck: input.requiresDoubleCheck,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'inpatient_order.create', resourceType: 'order', resourceId: order.id,
        visitRef: order.visitId, result: 'success',
        detail: { orderNo: order.orderNo, category: order.category, orderType: order.orderType },
      },
      tx,
    );
    return order;
  });
}

export async function reviewInpatientOrder(auth: AuthView, orderId: string): Promise<Order> {
  requireDoctor(auth, '审核医嘱');
  const existing = await getOrderById(orderId);
  if (!existing) throw notFound('医嘱不存在');
  await loadInpatientVisit(auth, existing.visitId);

  const db = getDb();
  return db.begin(async (tx) => {
    const order = await repoReviewOrder(orderId, auth.id, tx);
    if (!order) {
      const cur = await getOrderById(orderId, tx);
      if (!cur) throw notFound('医嘱不存在');
      throw conflict(`医嘱当前状态 ${cur.status}，不可审核`);
    }
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'inpatient_order.review', resourceType: 'order', resourceId: order.id,
        visitRef: order.visitId, result: 'success', detail: { orderNo: order.orderNo },
      },
      tx,
    );
    return order;
  });
}

export async function rejectInpatientOrder(
  auth: AuthView, orderId: string, reason: string,
): Promise<Order> {
  requireDoctor(auth, '驳回医嘱');
  if (!reason?.trim()) throw badRequest('驳回原因不能为空');
  const existing = await getOrderById(orderId);
  if (!existing) throw notFound('医嘱不存在');
  await loadInpatientVisit(auth, existing.visitId);

  const db = getDb();
  return db.begin(async (tx) => {
    const order = await repoRejectOrder(orderId, auth.id, reason, tx);
    if (!order) {
      const cur = await getOrderById(orderId, tx);
      throw conflict(`医嘱当前状态 ${cur?.status ?? '?'}，不可驳回`);
    }
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'inpatient_order.reject', resourceType: 'order', resourceId: order.id,
        visitRef: order.visitId, result: 'success', detail: { orderNo: order.orderNo, reason },
      },
      tx,
    );
    return order;
  });
}

export interface AdministerInput {
  /** 执行时点；缺省取当前小时槽 */
  slot?: string;
  dose?: string;
  /** 双人核对人（高风险药/血制品必填，且须不同于执行人） */
  checkedBy?: string | null;
  note?: string;
  status?: Administration['status'];
}

export interface AdministrationResult {
  order: Order;
  administration: Administration;
  /** 并发重复触发同一时点 → 幂等返回既有记录，true */
  deduplicated: boolean;
}

export async function administerInpatientOrder(
  auth: AuthView, orderId: string, input: AdministerInput = {},
): Promise<AdministrationResult> {
  requireNurse(auth, '执行医嘱');
  const order = await getOrderById(orderId);
  if (!order) throw notFound('医嘱不存在');
  const visit = await loadInpatientVisit(auth, order.visitId);
  if (order.status !== 'active') throw conflict(`医嘱当前状态 ${order.status}，不可执行`);

  // 高风险药/血制品双人核对强制
  if (order.requiresDoubleCheck) {
    if (!input.checkedBy) throw badRequest('该医嘱为高风险药/血制品，须双人核对（checkedBy）');
    if (input.checkedBy === auth.id) {
      throw badRequest('双人核对人须为另一名医护，不得与执行人为同一人');
    }
  }

  const slot = input.slot ?? defaultSlot();
  const idempotencyKey = buildIdempotencyKey(orderId, slot, auth.id);

  const db = getDb();
  return db.begin(async (tx) => {
    // 事务安全的幂等写入：ON CONFLICT DO NOTHING，命中唯一约束时返回既有记录
    const { admin, inserted } = await insertAdministrationOnce(
      {
        orderId, visitId: order.visitId, patientId: visit.patientId, slot, idempotencyKey,
        status: input.status, dose: input.dose ?? order.content, administeredBy: auth.id,
        checkedBy: input.checkedBy ?? null, note: input.note ?? null,
      },
      tx,
    );
    const administration = admin;
    const deduplicated = !inserted;

    // 临时医嘱：单次执行后即完成；长期医嘱保持 active 直至医师停止
    let updated = order;
    if (!deduplicated && order.category === 'short_term') {
      const executed = await markOrderExecuted(orderId, tx);
      if (executed) updated = executed;
    }

    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: deduplicated ? 'inpatient_order.administer_dedup' : 'inpatient_order.administer',
        resourceType: 'order', resourceId: orderId, patientRef: visit.patientId,
        visitRef: order.visitId, result: 'success',
        detail: { orderNo: order.orderNo, slot, deduplicated, doubleCheck: Boolean(input.checkedBy) },
      },
      tx,
    );

    return { order: updated, administration, deduplicated };
  });
}

export async function stopInpatientOrder(auth: AuthView, orderId: string): Promise<Order> {
  requireDoctor(auth, '停止医嘱');
  const existing = await getOrderById(orderId);
  if (!existing) throw notFound('医嘱不存在');
  await loadInpatientVisit(auth, existing.visitId);

  const db = getDb();
  return db.begin(async (tx) => {
    const order = await repoStopOrder(orderId, tx);
    if (!order) {
      const cur = await getOrderById(orderId, tx);
      throw conflict(`医嘱当前状态 ${cur?.status ?? '?'}，不可停止`);
    }
    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'inpatient_order.stop', resourceType: 'order', resourceId: order.id,
        visitRef: order.visitId, result: 'success', detail: { orderNo: order.orderNo },
      },
      tx,
    );
    return order;
  });
}

export interface OrderWithAdministrations extends Order {
  administrations: Administration[];
}

/** 在院医嘱视图：长期 / 临时分组，含执行史。 */
export async function getInpatientOrderView(
  auth: AuthView, visitId: string,
): Promise<{ visitId: string; longTerm: OrderWithAdministrations[]; shortTerm: OrderWithAdministrations[] }> {
  await loadInpatientVisit(auth, visitId);
  const orders = await getOrdersByVisit(visitId, { limit: 300 });
  const withAdmin: OrderWithAdministrations[] = [];
  for (const o of orders) {
    const administrations = await listAdministrationsByOrder(o.id);
    withAdmin.push({ ...o, administrations });
  }
  return {
    visitId,
    longTerm: withAdmin.filter((o) => o.category === 'long_term'),
    shortTerm: withAdmin.filter((o) => o.category === 'short_term'),
  };
}
