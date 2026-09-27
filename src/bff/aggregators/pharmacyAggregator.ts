/**
 * 健澜科技 jlmedaios - 药房调剂发药聚合器（M2-A）
 *
 * 在处方「已审核 approved」后，由药师完成调剂发药：
 *  1) 发药前以 CDS 规则引擎做最后安全闸（药物过敏/相互作用/禁忌），
 *     block 规则必须填写 override 原因并留痕，否则拒绝发药；
 *  2) 同一事务内：按批次原子扣减库存（不足整体回滚，绝不部分发药）、
 *     写库存流水、写发药记录（幂等键防重复发药）、处方置 dispensed、
 *     审计哈希链；
 *  3) 职责分离：仅药师（pharmacist/admin）可发药，医师/护士 403。
 *
 * 门诊与住院处方均经此发药（药师 hospital/all 数据范围）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { buildAuthView } from '../view/userView.js';
import { getDb, type DbExecutor } from '../../db/pool.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { getPatientById } from '../../db/repositories/patientRepo.js';
import { getDrugByCode } from '../../db/repositories/drugRepo.js';
import { getOrdersByVisit } from '../../db/repositories/orderRepo.js';
import { getUserById, getUserRoleLinks } from '../../db/repositories/userRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  type Prescription,
  type PrescriptionItem,
  auditPrescription,
  getPrescriptionById,
  getPrescriptionsByVisit,
} from '../../db/repositories/prescriptionRepo.js';
import {
  deductInventory,
  insertMovement,
  listInventory,
  listMovements,
  type Movement,
} from '../../db/repositories/inventoryRepo.js';
import {
  insertDispensingOnce,
  listDispensingsByPrescription,
  listRecentDispensings,
  type Dispensing,
} from '../../db/repositories/dispensingRepo.js';
import { CDSEngine } from '../../knowledge/cds/CDSEngine.js';
import { drugRules } from '../../knowledge/cds/rules/drugRules.js';
import type {
  CdsExecutionResult,
  CdsFacts,
  RuleHit,
} from '../../knowledge/cds/Rule.js';

/* -------------------------------- 错误类型 ------------------------------- */

export class PharmacyError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PharmacyError';
  }
}
const badRequest = (m: string) => new PharmacyError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new PharmacyError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new PharmacyError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new PharmacyError(409, 'CONFLICT', m);

/* ------------------------------ 角色 / 引擎 ------------------------------ */

function isPharmacist(auth: AuthView): boolean {
  return auth.rawRoles.includes('pharmacist') || auth.rawRoles.includes('admin');
}
function requirePharmacist(auth: AuthView, action: string): void {
  if (!isPharmacist(auth)) throw forbidden(`${action}：仅药师可操作`);
}

/** 药师全院发药：all/hospital 全开放；其余按科室范围判定。 */
function canAccess(auth: AuthView, visit: Visit): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return visit.department === auth.deptName;
  }
  return visit.attendingDoctorId === auth.id;
}

const engine = new CDSEngine();
engine.registerRules(drugRules);

/* -------------------------------- 事实构造 ------------------------------- */

function calcAge(birthDate: string | null): number | undefined {
  if (!birthDate) return undefined;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() ||
      (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}
function mapGender(g: string): CdsFacts['gender'] {
  if (g === '男') return 'male';
  if (g === '女') return 'female';
  return 'unknown';
}

/** 解析明细对应药品（drug_code → 目录）。 */
async function resolveDrug(item: PrescriptionItem, tx: DbExecutor) {
  if (!item.drugCode) return null;
  return getDrugByCode(item.drugCode, tx);
}

/**
 * 构造发药 CDS 事实。
 * currentDrugs：该就诊 active 医嘱内容 + 其他已审/已发处方药品（排除本处方）；
 * newDrugs：本处方药品通用名。
 */
async function buildFacts(
  patient: { id: string; gender: string; birthDate: string | null; allergies: Array<Record<string, unknown>> },
  visit: Visit,
  rx: Prescription,
  itemGeneric: ReadonlyArray<string>,
  tx: DbExecutor,
): Promise<CdsFacts> {
  const allergies = patient.allergies
    .map((a) => (a.allergen ? String(a.allergen) : ''))
    .filter(Boolean);

  const current = new Set<string>();
  const orders = await getOrdersByVisit(visit.id, { limit: 200 }, tx);
  for (const o of orders) {
    if (o.status === 'active') current.add(o.content);
  }
  // 其他处方药品（门诊场景在医嘱之外的在用药物）
  const otherRx = await tx`
    SELECT pi.drug_name
    FROM clinical.prescriptions p
    JOIN clinical.prescription_items pi ON pi.prescription_id = p.id
    WHERE p.visit_id = ${visit.id} AND p.id <> ${rx.id}
      AND p.status IN ('approved', 'dispensed')
  `;
  for (const row of otherRx) current.add(String((row as Record<string, unknown>).drug_name));

  return {
    patientId: patient.id,
    age: calcAge(patient.birthDate),
    gender: mapGender(patient.gender),
    allergies,
    currentDrugs: Array.from(current),
    newDrugs: itemGeneric,
    diagnoses: [],
    symptoms: [],
    signs: [],
    encounterType: visit.visitType === 'inpatient' ? 'inpatient' : 'outpatient',
    labResults: [],
  };
}

function slimHit(h: RuleHit) {
  return {
    ruleId: h.ruleId,
    title: h.title,
    message: h.message,
    level: h.level,
    actionType: h.actionType,
    requireOverride: h.requireOverride,
    suggestions: h.suggestions,
  };
}

type CatalogDrug = NonNullable<Awaited<ReturnType<typeof getDrugByCode>>>;

interface CdsEvaluation {
  resolved: Map<string, { drug: CatalogDrug }>;
  result: CdsExecutionResult;
  hitSlim: ReturnType<typeof slimHit>[];
}

/**
 * 解析处方药品并运行发药前 CDS（preview 与 dispense 共用）。
 *  - strict=true（发药）：药品目录缺失即 400；
 *  - strict=false（预览）：缺失药品以处方名称兜底，不阻断预览。
 */
async function evaluateCds(
  patient: { id: string; gender: string; birthDate: string | null; allergies: Array<Record<string, unknown>> },
  visit: Visit,
  rx: Prescription,
  executor: DbExecutor,
  strict: boolean,
): Promise<CdsEvaluation> {
  const resolved = new Map<string, { drug: CatalogDrug }>();
  const newGeneric: string[] = [];
  for (const item of rx.items) {
    const drug = await resolveDrug(item, executor);
    if (!drug) {
      if (strict) throw badRequest(`药品「${item.drugName}」目录中不存在，无法发药`);
      newGeneric.push(item.drugName);
      continue;
    }
    resolved.set(item.id!, { drug });
    newGeneric.push(drug.genericName);
  }
  const facts = await buildFacts(patient, visit, rx, newGeneric, executor);
  const result = engine.run(facts, 'prescription_create');
  return { resolved, result, hitSlim: result.hits.map(slimHit) };
}

/**
 * 校验 CDS block 的 override 授权人：必须是具备 cds:override 权限的医师/管理员。
 * 药师不得单方对临床 block 强发（职责分离）。
 */
async function resolveOverrideAuthor(authorId: string | null | undefined): Promise<AuthView> {
  if (!authorId) {
    throw forbidden('CDS block 药须由具备 cds:override 权限的医师授权，药师不可单方强发');
  }
  const user = await getUserById(authorId);
  if (!user) throw forbidden('override 授权医师不存在或已停用');
  const view = buildAuthView(user, await getUserRoleLinks(user.id));
  if (!view.permissions.includes('cds:override')) {
    throw forbidden('override 须由具备 cds:override 权限的医师签名授权');
  }
  return view;
}

/* --------------------------------- 类型 ---------------------------------- */

export interface DispenseLine {
  itemId: string;
  batchNo?: string | null;
  quantity?: number;
}
export interface DispenseInput {
  warehouse?: string;
  lines?: DispenseLine[];
  overrideReason?: string;
  /** CDS block 后授权 override 的医师；缺省取开方医师，须具备 cds:override */
  overrideAuthorId?: string | null;
}
export interface DispenseResult {
  prescription: Prescription;
  dispensings: Dispensing[];
  cds: {
    passed: boolean;
    maxLevel: RuleHit['level'] | null;
    hits: ReturnType<typeof slimHit>[];
  };
  deduplicated: boolean;
}

/* --------------------------------- 发药 ---------------------------------- */

export async function dispensePrescription(
  auth: AuthView,
  prescriptionId: string,
  input: DispenseInput = {},
): Promise<DispenseResult> {
  requirePharmacist(auth, '处方发药');
  const rx = await getPrescriptionById(prescriptionId);
  if (!rx) throw notFound('处方不存在');
  const visit = await getVisitById(rx.visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccess(auth, visit)) throw forbidden('超出数据权限范围，无法发药');

  // 已发药：幂等返回，绝不重复扣库存
  if (rx.status === 'dispensed') {
    const dispensings = await listDispensingsByPrescription(rx.id);
    return {
      prescription: rx, dispensings,
      cds: { passed: true, maxLevel: null, hits: [] }, deduplicated: true,
    };
  }
  if (rx.status !== 'approved') throw conflict(`处方当前状态 ${rx.status}，不可发药`);

  const patient = await getPatientById(visit.patientId);
  if (!patient) throw notFound('患者不存在');

  const warehouse = input.warehouse ?? '中心药房';
  const db = getDb();

  return db.begin(async (tx) => {
    // 解析药品 + 发药前 CDS 最后安全闸（strict：药品缺失即 400）
    const evaluation = await evaluateCds(patient, visit, rx, tx, true);
    const { resolved, result, hitSlim } = evaluation;
    const blocks = result.hits.filter((h) => h.actionType === 'block' && h.requireOverride);

    // CDS block：无 override 原因 → 409；有原因但无医师授权 → 403（职责分离）
    let overrideReason: string | null = null;
    let overrideAuthor: AuthView | null = null;
    if (blocks.length > 0) {
      if (!input.overrideReason?.trim()) {
        throw new PharmacyError(409, 'CDS_BLOCK',
          `CDS 拦截（${blocks.map((b) => b.ruleId).join(',')}），请复核或由医师填写 override 原因后发药`);
      }
      overrideAuthor = await resolveOverrideAuthor(input.overrideAuthorId ?? rx.prescriberId);
      overrideReason = input.overrideReason!.trim();
    }

    // 逐项扣库存 + 流水 + 发药记录（同事务，任一不足整体回滚）
    const dispensings: Dispensing[] = [];
    for (const item of rx.items) {
      const { drug } = resolved.get(item.id!)!;
      const line = input.lines?.find((l) => l.itemId === item.id);
      const qty = line?.quantity ?? item.quantity ?? 0;
      const batchNo = line?.batchNo ?? null;
      if (!(qty > 0)) throw badRequest('发药数量必须大于 0');

      const ded = await deductInventory(tx, { drugId: drug.id, warehouse, batchNo, qty });
      if (!ded) {
        throw conflict(`药品「${drug.genericName}」在${warehouse}库存不足或无可用批次，无法发药`);
      }
      await insertMovement(tx, {
        drugId: drug.id, warehouse, batchNo: ded.inventory.batchNo,
        changeQty: -qty, balanceAfter: ded.inventory.quantity,
        reason: 'dispense', refType: 'prescription', refId: rx.id, actorId: auth.id,
      });

      const idempotencyKey = `${rx.id}:${item.id}:${auth.id}`;
      const ins = await insertDispensingOnce(tx, {
        prescriptionId: rx.id, itemId: item.id, drugId: drug.id, drugCode: drug.drugCode,
        drugName: drug.genericName, warehouse, batchNo: ded.inventory.batchNo,
        quantity: qty, unit: item.quantityUnit, dispensedBy: auth.id, idempotencyKey,
        overrideReason, overrideBy: overrideAuthor?.id ?? null, cdsHits: hitSlim,
      });
      dispensings.push(ins.dispensing);
    }

    // 处方置 dispensed（条件更新，防并发重复）
    const upd = await tx`
      UPDATE clinical.prescriptions SET status = 'dispensed', updated_at = now()
      WHERE id = ${rx.id} AND status = 'approved' RETURNING id
    `;
    if (upd.length === 0) throw conflict('处方状态已变更，发药终止');

    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'prescription.dispense', resourceType: 'prescription', resourceId: rx.id,
        patientRef: patient.id, visitRef: rx.visitId, result: 'success',
        detail: {
          rxNo: rx.rxNo, warehouse,
          overridden: Boolean(overrideReason), overrideReason,
          overrideAuthorId: overrideAuthor?.id ?? null,
          overrideAuthorName: overrideAuthor?.realName ?? null,
          cdsRules: result.hits.map((h) => h.ruleId),
        },
      },
      tx,
    );

    const finalRx = (await getPrescriptionById(rx.id, tx))!;
    return {
      prescription: finalRx, dispensings,
      cds: { passed: result.passed, maxLevel: result.maxLevel, hits: hitSlim },
      deduplicated: false,
    };
  });
}

/* ------------------------------- 队列/视图 ------------------------------- */

export interface QueueItem {
  prescription: Prescription;
  patientName: string | null;
  department: string | null;
}

/** 按状态加载处方队列（含患者脱敏名/科室）。 */
async function loadQueueForStatus(
  auth: AuthView,
  status: Prescription['status'],
  action: string,
): Promise<QueueItem[]> {
  requirePharmacist(auth, action);
  const db = getDb();
  const rows = await db`
    SELECT p.id
    FROM clinical.prescriptions p
    JOIN clinical.visits v ON v.id = p.visit_id
    WHERE p.status = ${status}
    ORDER BY p.created_at
  `;
  const items: QueueItem[] = [];
  for (const row of rows) {
    const id = String((row as Record<string, unknown>).id);
    const rx = await getPrescriptionById(id, db);
    if (!rx) continue;
    const visit = await getVisitById(rx.visitId, db);
    let patientName: string | null = null;
    if (visit) {
      const p = await getPatientById(visit.patientId, db);
      patientName = p?.nameMasked ?? null;
    }
    items.push({ prescription: rx, patientName, department: visit?.department ?? null });
  }
  return items;
}

/** 待发药队列（approved 处方，含明细）。 */
export function getDispenseQueue(auth: AuthView): Promise<QueueItem[]> {
  return loadQueueForStatus(auth, 'approved', '查待发药队列');
}

/** 待审方队列（pending_review 处方，含明细）。 */
export function getReviewQueue(auth: AuthView): Promise<QueueItem[]> {
  return loadQueueForStatus(auth, 'pending_review', '查待审方队列');
}

/**
 * 药师审方：pending_review → approved / rejected，同事务哈希链留痕。
 * 仅药师；并发审方以条件更新保证唯一结论。
 */
export async function reviewPendingPrescription(
  auth: AuthView,
  prescriptionId: string,
  input: { decision: 'approved' | 'rejected'; comment?: string | null },
): Promise<Prescription> {
  requirePharmacist(auth, '处方审方');
  if (input.decision !== 'approved' && input.decision !== 'rejected') {
    throw badRequest('审方结论无效');
  }
  const rx = await getPrescriptionById(prescriptionId);
  if (!rx) throw notFound('处方不存在');
  if (rx.status !== 'pending_review') {
    throw conflict(`处方当前状态 ${rx.status}，不可审方`);
  }
  const visit = await getVisitById(rx.visitId);
  if (visit && !canAccess(auth, visit)) throw forbidden('超出数据权限范围，无法审方');
  const patient = visit ? await getPatientById(visit.patientId) : null;

  const db = getDb();
  return db.begin(async (tx) => {
    const auditResult = {
      reviewerComment: input.comment ?? null,
      reviewedAt: new Date().toISOString(),
      channel: 'pharmacy-bff',
    };
    const updated = await auditPrescription(rx.id, input.decision, auth.id, auditResult, tx);
    if (!updated) throw conflict('处方状态已变更，审方终止');

    await recordChainAudit(
      {
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: input.decision === 'approved'
          ? 'prescription.review.approve'
          : 'prescription.review.reject',
        resourceType: 'prescription', resourceId: rx.id,
        patientRef: patient?.id, visitRef: rx.visitId, result: 'success',
        detail: { rxNo: rx.rxNo, comment: input.comment ?? null },
      },
      tx,
    );
    return (await getPrescriptionById(rx.id, tx))!;
  });
}

/** 发药前 CDS 预览（只读，不扣库存）：返回命中与是否存在 block。 */
export async function previewDispenseCds(
  auth: AuthView,
  prescriptionId: string,
): Promise<{
  passed: boolean;
  maxLevel: RuleHit['level'] | null;
  blocks: ReturnType<typeof slimHit>[];
  hits: ReturnType<typeof slimHit>[];
}> {
  requirePharmacist(auth, 'CDS 预览');
  const rx = await getPrescriptionById(prescriptionId);
  if (!rx) throw notFound('处方不存在');
  const visit = await getVisitById(rx.visitId);
  if (!visit) throw notFound('就诊不存在');
  const patient = await getPatientById(visit.patientId);
  if (!patient) throw notFound('患者不存在');

  const evaluation = await evaluateCds(patient, visit, rx, getDb(), false);
  return {
    passed: evaluation.result.passed,
    maxLevel: evaluation.result.maxLevel,
    blocks: evaluation.hitSlim.filter((h) => h.actionType === 'block'),
    hits: evaluation.hitSlim,
  };
}

/** 发药记录总览（可按处方/药房）。 */
export async function getDispensingRecords(
  auth: AuthView,
  options?: { prescriptionId?: string; warehouse?: string },
): Promise<Dispensing[]> {
  requirePharmacist(auth, '查发药记录');
  if (options?.prescriptionId) return listDispensingsByPrescription(options.prescriptionId);
  return listRecentDispensings({ warehouse: options?.warehouse, limit: 200 });
}

/** 库存流水视图（药师/护士）。 */
export async function getInventoryMovements(
  auth: AuthView,
  options?: { drugId?: string; warehouse?: string; reason?: string },
): Promise<Movement[]> {
  if (!auth.rawRoles.includes('pharmacist') && !auth.rawRoles.includes('admin') &&
      !auth.rawRoles.includes('nurse')) {
    throw forbidden('仅药师/护士可查看库存流水');
  }
  return listMovements({ ...options, limit: 200 });
}

/** 某就诊处方视图（含状态，供前端按就诊定位）。 */
export async function getPrescriptionsForVisitView(
  auth: AuthView,
  visitId: string,
): Promise<Prescription[]> {
  return getPrescriptionsByVisit(visitId, { limit: 50 });
}

/** 库存视图。 */
export async function getInventory(
  auth: AuthView,
  options?: { warehouse?: string; keyword?: string },
) {
  if (!auth.rawRoles.includes('pharmacist') && !auth.rawRoles.includes('admin') &&
      !auth.rawRoles.includes('nurse')) {
    throw forbidden('仅药师/护士可查看库存');
  }
  return listInventory({ ...options, limit: 300 });
}
