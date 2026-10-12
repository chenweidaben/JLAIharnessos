/**
 * 健澜科技 jlmedaios - 患者端住院费用视图聚合器（M50-A）
 *
 * 返回患者在院（ongoing）就诊的：费用明细（按业务大类汇总）、医保结算预估、
 * 押金余额。
 *
 * 自限域强约束：患者（patient 角色）只能查自己账号绑定的就诊人 patient_id
 * （clinical.patient_profiles.account_id → patient_id）；查别人的 patient_id → 403。
 * admin/doctor/nurse 等院方角色可查任意患者。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { listFeeItemsByVisit } from '../../db/repositories/billingRepo.js';
import { listPaymentsByPatient } from '../../db/repositories/internetPaymentRepo.js';
import { getVisitsByPatient } from '../../db/repositories/visitRepo.js';
import {
  buildCostBreakdown,
  estimateInsuranceSettlement,
  depositBalance,
  type CostBreakdown,
  type InsuranceEstimate,
} from '../../medical-tools/nursing/patientBilling.js';

export class PatientBillingError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'PatientBillingError';
  }
}
const notFound = (m: string) => new PatientBillingError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new PatientBillingError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new PatientBillingError(400, 'BAD_REQUEST', m);

/** 院方角色（可跨患者查看费用）。 */
const STAFF_ROLES = ['admin', 'doctor', 'nurse', 'cashier'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 患者端默认医保报销比例（无保单明细时的预估口径）。 */
const DEFAULT_INSURANCE_RATE = 0.6;

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

/** 校验患者是否有权查看该 patientId：院方放行；患者须有 account_id→patient_id 绑定。 */
async function assertPatientScope(auth: AuthView, patientId: string): Promise<void> {
  if (auth.rawRoles.some((r) => STAFF_ROLES.includes(r))) return;
  const rows = await getDb()`
    SELECT 1 FROM clinical.patient_profiles
    WHERE account_id = ${auth.id} AND patient_id = ${patientId}
    LIMIT 1
  `;
  if (rows.length === 0) throw forbidden('只能查看本人就诊人的费用');
}

export interface PatientBillingView {
  patientId: string;
  visitId: string | null;
  visitStatus: string | null;
  breakdown: CostBreakdown;
  insuranceEstimate: InsuranceEstimate;
  deposit: { paid: number; balance: number };
  itemCount: number;
}

/**
 * 患者端住院费用视图。
 * @param patientId 目标患者（患者本人或其绑定就诊人；院方可传任意）。
 * @param insuranceRate 可选报销比例覆盖（默认 0.6）。
 */
export async function patientBillingView(
  auth: AuthView,
  patientId: string,
  insuranceRate?: number,
): Promise<PatientBillingView> {
  assertPermission(auth, 'patient_billing:view');
  if (!UUID_RE.test(patientId.trim())) throw badRequest('患者标识非法');
  await assertPatientScope(auth, patientId.trim());

  const visits = await getVisitsByPatient(patientId.trim());
  const ongoing = visits.find((v) => v.status === 'ongoing') ?? null;

  // 费用明细：在院就诊；无在院就诊则汇总为空。
  const feeLines = ongoing
    ? await listFeeItemsByVisit(ongoing.id)
    : [];
  const activeLines = feeLines.filter((f) => f.status !== 'void' && f.status !== 'refunded');
  const breakdown = buildCostBreakdown(
    activeLines.map((f) => ({ category: f.category, amount: Number(f.amount) || 0 })),
  );

  // 已缴（押金/已付）：该患者成功支付的合计。
  const payments = await listPaymentsByPatient(auth.id, patientId.trim());
  const paid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const rate = insuranceRate ?? DEFAULT_INSURANCE_RATE;
  const insuranceEstimate = estimateInsuranceSettlement(breakdown.total, rate);
  const balance = depositBalance(paid, breakdown.total);

  return {
    patientId: patientId.trim(),
    visitId: ongoing?.id ?? null,
    visitStatus: ongoing?.status ?? null,
    breakdown,
    insuranceEstimate,
    deposit: { paid: Math.round(paid * 100) / 100, balance },
    itemCount: activeLines.length,
  };
}
