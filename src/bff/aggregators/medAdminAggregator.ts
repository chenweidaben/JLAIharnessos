/**
 * 健澜科技 jlmedaios - 给药三查七对聚合器（M17-B）
 *
 * 复用 inpatientCareAggregator.canAccessVisit（越权 403）。执行给药时：
 *   先跑五对核对 -> 任一项 fail 且无 override_reason => 400；
 *   high_risk 且 double_check_by 空或 = 本人 => 409；
 *   本人 signature 必填；recordChainAudit 留痕；idempotency_key 重复 => 409。
 *
 * 医疗安全：本层只做"核对 + 留痕 + 执行"，不开新医嘱、不代护士签名；
 * NQI_MED_ERROR 分母=given 数、分子=error_type 为差错类的数。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import {
  createMedAdmin,
  getMedAdminById,
  listMedAdmins,
  listAllForMetrics,
  isUniqueViolation,
  type MedAdministration,
} from '../../db/repositories/medAdminRepo.js';
import {
  runFiveChecks,
  allChecksPass,
  isHighRiskMed,
  requiresDoubleCheck,
  canOverride,
  computeMedErrorMetrics,
  type CheckItem,
  type MedAdminStatus,
  type MedErrorType,
} from '../../medical-tools/nursing/medAdminCheck.js';

export class MedAdminError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'MedAdminError';
  }
}
const badRequest = (m: string) => new MedAdminError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new MedAdminError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new MedAdminError(409, 'CONFLICT', m);
const forbidden = (m: string) => new MedAdminError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为用户 UUID`);
}

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围，无法操作该患者');
  return visit;
}

// ---------------------------------------------------------------------------
// 执行给药（三查七对 + 双人核对 + 本人签名）
// ---------------------------------------------------------------------------

export interface ExecuteMedInput {
  orderId: string;
  visitId: string;
  medName: string;
  dose: string;
  route?: string;
  medFreq?: string;
  /** 腕带扫描到的 patientId */
  wristbandPatientId: string;
  /** 医嘱药名（用于药名比对）；缺省用 medName */
  orderMedName?: string;
  orderDose?: string;
  withinTimeWindow?: boolean;
  notExpired?: boolean;
  cdsBlocked?: boolean;
  overrideReason?: string | null;
  doubleCheckBy?: string | null;
  signature: string;
  status?: MedAdminStatus;
  errorType?: MedErrorType | null;
  idempotencyKey: string;
}

export interface ExecuteMedResult {
  administration: MedAdministration;
  checks: CheckItem[];
  highRisk: boolean;
}

export async function executeMed(auth: AuthView, input: ExecuteMedInput): Promise<ExecuteMedResult> {
  assertPermission(auth, 'med_admin:execute');
  assertUuid(input.visitId, '就诊');
  assertUuid(input.orderId, '医嘱');

  const signature = (input.signature ?? '').trim();
  if (!signature) throw badRequest('给药执行须由护士本人签名（signature 不能为空）');
  if (!input.idempotencyKey) throw badRequest('idempotencyKey 不能为空');

  const visit = await loadVisit(auth, input.visitId);

  // 1) 五对核对
  const checks = runFiveChecks({
    wristbandPatientId: input.wristbandPatientId,
    visitPatientId: visit.patientId,
    orderMedName: input.orderMedName ?? input.medName,
    actualMedName: input.medName,
    orderDose: input.orderDose ?? input.dose,
    actualDose: input.dose,
    withinTimeWindow: input.withinTimeWindow ?? true,
    notExpired: input.notExpired ?? true,
  });
  const passed = allChecksPass(checks);

  // 2) CDS 拦截 override 校验：被拦但理由空 -> 拒绝
  const cdsBlocked = input.cdsBlocked === true;
  if (!canOverride(cdsBlocked, input.overrideReason)) {
    throw badRequest('CDS 已拦截该给药，必须填写 override_reason 后方可继续');
  }

  // 3) 五对未全过：无 override 理由 => 400（患者/药名/剂量错为硬红线）
  if (!passed && !(input.overrideReason ?? '').trim()) {
    const failed = checks.filter((c) => !c.ok).map((c) => c.label).join('、');
    throw badRequest(`五对核对未通过：${failed}；须修正或填写 override_reason`);
  }

  // 4) 高危药双人核对
  const highRisk = isHighRiskMed(input.medName);
  const doubleCheckBy = input.doubleCheckBy?.trim() || null;
  if (requiresDoubleCheck(highRisk)) {
    if (!doubleCheckBy) throw conflict('高危药（毒麻精放/高警示）执行须双人核对：double_check_by 必填');
    if (doubleCheckBy === auth.id) throw conflict('双人核对人不得与执行人相同');
  }

  return withTx(async (tx) => {
    let rec: MedAdministration;
    try {
      rec = await createMedAdmin(
        {
          orderId: input.orderId,
          visitId: visit.id,
          patientId: visit.patientId,
          medName: input.medName,
          dose: input.dose,
          route: input.route ?? '',
          medFreq: input.medFreq ?? '',
          checkPatient: checks[0].ok,
          checkMed: checks[1].ok,
          checkDose: checks[2].ok,
          checkTime: checks[3].ok,
          checkExpire: checks[4].ok,
          highRisk,
          doubleCheckBy: highRisk ? doubleCheckBy : null,
          administeredBy: auth.id,
          signature,
          cdsBlocked,
          overrideReason: input.overrideReason ?? null,
          status: input.status ?? 'given',
          errorType: input.errorType ?? null,
          idempotencyKey: input.idempotencyKey,
        },
        tx,
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict('重复给药请求（idempotency_key 冲突），已拒绝');
      throw err;
    }

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'med_admin.execute',
        resourceType: 'visit',
        resourceId: visit.id,
        result: 'success',
        riskLevel: highRisk ? 'high' : 'low',
        detail: {
          administrationId: rec.id, medName: input.medName, highRisk,
          doubleCheckBy, allChecksPass: passed, cdsBlocked,
        },
      },
      tx,
    );
    return { administration: rec, checks, highRisk };
  });
}

// ---------------------------------------------------------------------------
// 查询
// ---------------------------------------------------------------------------

export async function listMedAdminsView(
  auth: AuthView,
  filter: { visitId?: string; orderId?: string; status?: string; errorType?: string },
) {
  assertPermission(auth, 'med_admin:read');
  return listMedAdmins(filter);
}

export async function getMedAdminView(auth: AuthView, id: string) {
  assertPermission(auth, 'med_admin:read');
  assertUuid(id, '给药记录');
  const rec = await getMedAdminById(id);
  if (!rec) throw notFound('给药记录不存在');
  return rec;
}

/** NQI_MED_ERROR：分母=given 数，分子=差错类 error_type 数。 */
export async function getMedErrorMetrics(auth: AuthView) {
  assertPermission(auth, 'med_admin:read');
  const rows = await listAllForMetrics();
  const metrics = computeMedErrorMetrics(rows.map((r) => ({ status: r.status, errorType: r.errorType })));
  return {
    totalAdministrations: rows.length,
    metrics,
  };
}
