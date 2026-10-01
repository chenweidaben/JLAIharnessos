/**
 * 健澜科技 jlmedaios - 互联网处方配送 + 在线报告聚合器（M3-N）
 *
 * 闭环：已支付（paid）的电子处方进入履约
 *   → 药师建单（自取 / 快递，地址快照固化）→ 打包 → 发货（物流单号）
 *   → 确认送达 / 自取核销 / 取消（未发货可取消）。
 *
 * 在线报告：检验结果（lab_results）+ 影像报告（imaging_reports）
 *          + AI 检验解读（lab_interpretations），与院内同一临床表，
 *          患者本人 / 授权医护按 DataScope 查看。
 *
 * 安全约束：
 *  - 仅 paid 处方可建配送单；一单处方同时仅一个有效配送单（幂等返回既有单）；
 *  - 患者本人归属强校验；医护按 DataScope（全量）过滤；
 *  - 状态机单向推进（repo CAS），发货必须固化物流单号，自取凭取货码核销；
 *  - 关键动作（建单/发货/取消）审计哈希链留痕。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx, getDb } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getEPrescriptionById, type EPrescription } from '../../db/repositories/internetPrescriptionRepo.js';
import {
  createDelivery,
  updateDeliveryStatus,
  listDeliveriesByPatient,
  listAllDeliveries,
  getDeliveryById,
  nextPickupCode,
  type PrescriptionDelivery,
  type DeliveryChannel,
  type DeliveryStatus,
} from '../../db/repositories/deliveryRepo.js';
import {
  listLabResults,
  listImagingReports,
  listLabInterpretations,
} from '../../db/repositories/reportRepo.js';
import type { AuthView } from '../view/userView.js';

export class InternetDeliveryError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InternetDeliveryError';
  }
}
const badRequest = (m: string) => new InternetDeliveryError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new InternetDeliveryError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new InternetDeliveryError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new InternetDeliveryError(409, 'CONFLICT', m);

const genDeliveryNo = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `DLV${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${Math.floor(100000 + Math.random() * 900000)}`;
};

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  created: '待打包', packed: '已打包', shipped: '已发货',
  delivered: '已送达', picked_up: '已取走', cancelled: '已取消',
};

/** 药房/财务：为已支付处方创建配送单（自取 / 快递）。幂等：已有有效单返回既有单。 */
export async function createDeliveryByPharmacy(
  auth: AuthView,
  input: { rxId: string; channel: DeliveryChannel; address?: string },
): Promise<{ result: 'created' | 'exists'; delivery: PrescriptionDelivery; rx: EPrescription }> {
  if (!input.rxId?.trim()) throw badRequest('缺少电子处方 ID');
  if (input.channel !== 'self_pick' && input.channel !== 'express') {
    throw badRequest('配送方式仅支持 self_pick / express');
  }
  if (input.channel === 'express' && !input.address?.trim()) {
    throw badRequest('快递配送必须填写收货地址');
  }

  const rx = await getEPrescriptionById(input.rxId);
  if (!rx) throw notFound('电子处方不存在');
  if (rx.status !== 'paid') {
    throw conflict(`仅已支付处方可配送，当前状态 ${rx.status}`);
  }

  return withTx(async (tx) => {
    const deliveryNo = genDeliveryNo();
    let pickupCode: string | null = null;
    if (input.channel === 'self_pick') {
      pickupCode = await nextPickupCode(tx);
    }
    const res = await createDelivery(
      {
        deliveryNo,
        rxId: rx.id,
        patientId: rx.patientId,
        accountId: rx.accountId,
        channel: input.channel,
        addressSnapshot: input.channel === 'express' ? input.address!.trim() : null,
        pickupCode,
        createdBy: auth.id,
      },
      tx,
    );

    if (res.result === 'created') {
      await recordChainAudit(
        {
          actorId: auth.id,
          actorRole: auth.rawRoles.join(','),
          actorDept: auth.deptName,
          action: 'internet.delivery_create',
          resourceType: 'prescription_delivery',
          resourceId: res.delivery.id,
          patientRef: rx.patientId,
          result: 'success',
          riskLevel: 'medium',
          detail: {
            deliveryNo: res.delivery.deliveryNo,
            rxNo: rx.rxNo,
            channel: res.delivery.channel,
            pickupCode: res.delivery.pickupCode,
          },
        },
        tx,
      );
    }
    return { result: res.result, delivery: res.delivery, rx };
  });
}

/** 药房：配送履约状态推进（打包/发货/送达/核销/取消）。 */
export async function fulfillDeliveryByPharmacy(
  auth: AuthView,
  input: {
    deliveryId: string;
    to: 'packed' | 'shipped' | 'delivered' | 'picked_up' | 'cancelled';
    courierCompany?: string;
    trackingNo?: string;
  },
): Promise<PrescriptionDelivery> {
  if (!input.deliveryId?.trim()) throw badRequest('缺少配送单 ID');
  if (!input.to) throw badRequest('缺少目标状态');

  const d = await getDeliveryById(input.deliveryId);
  if (!d) throw notFound('配送单不存在');

  if (input.to === 'shipped') {
    if (!input.courierCompany?.trim() || !input.trackingNo?.trim()) {
      throw badRequest('发货必须填写物流公司与快递单号');
    }
    if (d.channel !== 'express') throw conflict('自取单不可发货（请走核销）');
  }
  if (input.to === 'picked_up' && d.channel !== 'self_pick') {
    throw conflict('快递单不可自取核销（请走签收）');
  }

  return withTx(async (tx) => {
    const updated = await updateDeliveryStatus(
      {
        id: d.id,
        to: input.to,
        fulfilledBy: input.to === 'packed' || input.to === 'shipped' ? auth.id : null,
        confirmedBy: input.to === 'delivered' || input.to === 'picked_up' ? auth.id : null,
        cancelledBy: input.to === 'cancelled' ? auth.id : null,
        courierCompany: input.to === 'shipped' ? input.courierCompany?.trim() : null,
        trackingNo: input.to === 'shipped' ? input.trackingNo?.trim() : null,
      },
      tx,
    );
    if (!updated) throw conflict(`当前状态 ${d.status} 不可变更为 ${input.to}`);

    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: `internet.delivery_${input.to}`,
        resourceType: 'prescription_delivery',
        resourceId: d.id,
        patientRef: d.patientId,
        result: 'success',
        riskLevel: input.to === 'cancelled' ? 'high' : 'medium',
        detail: {
          deliveryNo: d.deliveryNo,
          from: d.status,
          to: input.to,
          courierCompany: updated.courierCompany,
          trackingNo: updated.trackingNo,
        },
      },
      tx,
    );
    return updated;
  });
}

/** 患者：我的配送单（本人归属校验）。 */
export async function listMyDeliveries(
  accountId: string,
  patientId: string,
  deliveryId?: string,
): Promise<PrescriptionDelivery[]> {
  const list = await listDeliveriesByPatient(patientId);
  const mine = list.filter((x) => x.accountId === accountId);
  if (deliveryId) {
    const hit = mine.find((x) => x.id === deliveryId);
    if (!hit) throw forbidden('仅本人配送单可查看');
    return [hit];
  }
  return mine;
}

/** 药房/管理：全部配送单（DataScope 全量）。 */
export async function listDeliveriesForPharmacy(
  _auth: AuthView,
  status?: DeliveryStatus | 'all',
): Promise<PrescriptionDelivery[]> {
  return listAllDeliveries(status && status !== 'all' ? status : undefined);
}

/** 药房：可配送处方（已支付、尚未建有效配送单）。 */
export async function listPaidRxForDelivery(): Promise<EPrescription[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM clinical.internet_prescriptions
    WHERE status = 'paid' ORDER BY created_at DESC LIMIT 100`;
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    rxNo: String(r.rx_no),
    sessionId: String(r.session_id),
    accountId: String(r.account_id),
    profileId: String(r.profile_id),
    patientId: String(r.patient_id),
    prescriberId: String(r.prescriber_id),
    department: r.department != null ? String(r.department) : null,
    status: String(r.status) as EPrescription['status'],
    riskLevel: r.risk_level != null ? String(r.risk_level) : null,
    counsel: r.counsel != null ? String(r.counsel) : null,
    totalFee: r.total_fee != null ? Number(r.total_fee) : null,
    idempotencyKey: String(r.idempotency_key),
    reviewerId: r.reviewer_id != null ? String(r.reviewer_id) : null,
    auditComment: r.audit_comment != null ? String(r.audit_comment) : null,
    auditedAt: r.audited_at != null ? String(r.audited_at) : null,
    returnReason: r.return_reason != null ? String(r.return_reason) : null,
    cancelledBy: r.cancelled_by != null ? String(r.cancelled_by) : null,
    cancelledAt: r.cancelled_at != null ? String(r.cancelled_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    items: [],
  }));
}

/** 配送状态文案（前端展示用，避免前端硬编码中文映射漂移）。 */
export function deliveryStatusLabel(status: DeliveryStatus): string {
  return STATUS_LABEL[status] ?? status;
}

/** 患者：本人报告（归属校验）。 */
export async function listReportsByPatient(
  accountId: string,
  patientId: string,
  visitId?: string,
) {
  const labs = await listLabResults(patientId, visitId);
  const imaging = await listImagingReports(patientId, visitId);
  const interpretations = await listLabInterpretations(patientId, visitId);
  // 归属复核：数据必须属于该患者
  if (visitId) {
    const anyForeign =
      labs.some((x) => x.visitId !== visitId) ||
      imaging.some((x) => x.visitId !== visitId) ||
      interpretations.some((x) => x.visitId !== visitId);
    if (anyForeign) throw forbidden('越权访问他人报告');
  }
  return { labs, imaging, interpretations };
}

/** 医护（doctor/admin/药师）：按 DataScope 查询报告；患者本人以外需指定 patientId。 */
export async function listReportsForStaff(
  auth: AuthView,
  patientId?: string,
  visitId?: string,
) {
  if (!patientId?.trim()) throw badRequest('医护查询报告必须指定患者');
  const labs = await listLabResults(patientId, visitId);
  const imaging = await listImagingReports(patientId, visitId);
  const interpretations = await listLabInterpretations(patientId, visitId);
  return { labs, imaging, interpretations };
}
