/**
 * 健澜科技 jlmedaios - 双向转诊聚合器（M3-R）
 *
 * 医联体/集团医院间双向转诊：发起登记、随附资料获取与存储、
 * 接收（院外患者 EMPI 建档 + 生成本院就诊）、拒绝、完成、取消。
 *
 * 对标国家医院智慧服务三级基本项目【3 转诊服务】：
 *   院外转诊信息（DICOM/病案首页/诊断证明/检验/检查）直接存储于医院信息系统。
 *
 * 安全边界：
 *  - 状态机白名单 + FOR UPDATE 行锁，非法转换拒绝；
 *  - 接收转诊时院外患者才建档，已建档患者不重复建档；
 *  - 全程审计哈希链留痕。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { createPatient } from '../../db/repositories/patientRepo.js';
import { createVisit } from '../../db/repositories/visitRepo.js';
import { nextInternetPatientNo } from '../../db/repositories/internetPatientRepo.js';
import {
  advanceReferralStatus,
  getReferralById,
  insertReferral,
  insertReferralDocument,
  listReferralDocuments,
  listReferrals,
  lockReferral,
  nextReferralNo,
  type ReferralDirection,
  type ReferralDocType,
  type ReferralOrder,
} from '../../db/repositories/referralRepo.js';
import type { AuthView } from '../view/userView.js';

export class ReferralError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ReferralError';
  }
}

const badRequest = (m: string) => new ReferralError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ReferralError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new ReferralError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new ReferralError(409, 'CONFLICT', m);

/** 转诊详情：转诊单 + 随附资料。 */
export interface ReferralDetail {
  referral: ReferralOrder;
  documents: Awaited<ReturnType<typeof listReferralDocuments>>;
}

/** 数据范围过滤：all 全部；dept 本科室相关；self 本人发起。 */
function inScope(r: ReferralOrder, actor: AuthView): boolean {
  if (actor.dataScope === 'all') return true;
  if (actor.dataScope === 'self') return r.createdBy === actor.id;
  // dept：目标科室或源科室匹配本科室
  return r.targetDept === actor.deptName || r.sourceDept === actor.deptName;
}

/** 发起转诊登记。 */
export async function createReferral(
  actor: AuthView,
  input: {
    direction: ReferralDirection;
    patientId?: string | null;
    profileId?: string | null;
    patientName?: string | null;
    gender?: string | null;
    birthDate?: string | null;
    sourceOrg: string;
    sourceDept?: string | null;
    sourceDoctor?: string | null;
    targetOrg: string;
    targetDept?: string | null;
    reason: string;
    urgency?: 'normal' | 'urgent';
    status?: 'draft' | 'submitted';
  },
): Promise<ReferralOrder> {
  if (!input.reason.trim()) throw badRequest('转诊原因不能为空');
  if (!input.sourceOrg.trim() || !input.targetOrg.trim()) {
    throw badRequest('源机构与目标机构不能为空');
  }
  if (input.direction === 'incoming' && !input.patientId && !input.patientName?.trim()) {
    throw badRequest('转入登记需提供患者姓名或关联院内患者');
  }

  return withTx(async (tx) => {
    const referralNo = await nextReferralNo(tx);
    const referral = await insertReferral(
      {
        referralNo,
        direction: input.direction,
        patientId: input.patientId ?? null,
        profileId: input.profileId ?? null,
        patientName: input.patientName ?? null,
        gender: input.gender ?? null,
        birthDate: input.birthDate ?? null,
        sourceOrg: input.sourceOrg,
        sourceDept: input.sourceDept ?? null,
        sourceDoctor: input.sourceDoctor ?? null,
        targetOrg: input.targetOrg,
        targetDept: input.targetDept ?? null,
        reason: input.reason,
        urgency: input.urgency ?? 'normal',
        status: input.status ?? 'submitted',
        createdBy: actor.id,
      },
      tx,
    );

    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'referral.create',
        resourceType: 'referral',
        resourceId: referral.id,
        result: 'success',
        riskLevel: input.urgency === 'urgent' ? 'medium' : 'low',
        detail: { referralNo, direction: referral.direction },
      },
      tx,
    );

    return referral;
  });
}

/** 补充随附资料（院外转诊信息直接存储）。 */
export async function addDocument(
  actor: AuthView,
  referralId: string,
  input: {
    docType: ReferralDocType;
    title: string;
    contentRef?: string | null;
    contentText?: string | null;
    sourceOrg?: string | null;
  },
): Promise<ReferralDetail> {
  if (!input.title.trim()) throw badRequest('资料标题不能为空');
  if (!input.contentRef && !input.contentText?.trim()) {
    throw badRequest('资料内容（引用或文本）不能同时为空');
  }

  return withTx(async (tx) => {
    const referral = await lockReferral(referralId, tx);
    if (!referral) throw notFound('转诊单不存在');
    if (referral.status === 'cancelled' || referral.status === 'rejected') {
      throw conflict('该转诊单已结束，不能再补充资料');
    }

    await insertReferralDocument(
      {
        referralId,
        docType: input.docType,
        title: input.title,
        contentRef: input.contentRef ?? null,
        contentText: input.contentText ?? null,
        sourceOrg: input.sourceOrg ?? referral.sourceOrg,
      },
      tx,
    );

    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'referral.add_document',
        resourceType: 'referral',
        resourceId: referralId,
        result: 'success',
        riskLevel: 'low',
        detail: { docType: input.docType, title: input.title },
      },
      tx,
    );

    const documents = await listReferralDocuments(referralId, tx);
    return { referral, documents };
  });
}

/**
 * 接收转诊：院外患者 EMPI 建档 + 生成本院就诊，并回填转诊单。
 * 仅 incoming 且 submitted 状态可接收。
 */
export async function acceptReferral(
  actor: AuthView,
  referralId: string,
  input: {
    visitType?: 'outpatient' | 'inpatient';
    department: string;
    note?: string;
  },
): Promise<ReferralDetail> {
  if (!input.department.trim()) throw badRequest('接收科室不能为空');

  return withTx(async (tx) => {
    const referral = await lockReferral(referralId, tx);
    if (!referral) throw notFound('转诊单不存在');
    if (referral.direction !== 'incoming') {
      throw badRequest('仅转入单可执行接收操作');
    }

    const updated = await advanceReferralStatus(
      referralId,
      ['submitted'],
      {
        status: 'accepted',
        acceptedBy: actor.id,
        acceptedAt: new Date(),
      },
      tx,
    );
    if (!updated) throw conflict('转诊单当前状态不允许接收（可能已被处理）');

    // 确定患者：已建档则复用；院外未建档则 EMPI 建档。
    let patientId = updated.patientId;
    if (!patientId) {
      const mrn = await nextInternetPatientNo(tx);
      const patient = await createPatient(
        {
          mrn,
          nameMasked: updated.patientName ?? '院外转诊患者',
          gender: (updated.gender as '男' | '女' | '未知' | '未说明') ?? '未知',
          birthDate: updated.birthDate,
          tags: ['M3R_REFERRAL'],
          dataLevel: 3,
        },
        tx,
      );
      patientId = patient.id;
    }

    // 生成本院就诊。
    const visit = await createVisit(
      {
        patientId,
        visitType: input.visitType ?? 'outpatient',
        department: input.department,
        chiefComplaint: updated.reason,
        status: 'ongoing',
      },
      tx,
    );

    // 回填转诊单的就诊与患者关联。
    await tx`
      UPDATE clinical.referral_orders
         SET encounter_id = ${visit.id},
             patient_id = COALESCE(patient_id, ${patientId})
       WHERE id = ${referralId}
    `;

    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'referral.accept',
        resourceType: 'referral',
        resourceId: referralId,
        result: 'success',
        riskLevel: 'medium',
        detail: { encounterId: visit.id, patientId, newPatient: !updated.patientId },
      },
      tx,
    );

    // 所有回填完成后重新查询，确保返回最新状态（含 patient_id/encounter_id）。
    const fresh = await getReferralById(referralId, tx);
    const documents = await listReferralDocuments(referralId, tx);
    return { referral: fresh ?? updated, documents };
  });
}

/** 拒绝转诊（仅 submitted 可拒绝）。 */
export async function rejectReferral(
  actor: AuthView,
  referralId: string,
  reason: string,
): Promise<ReferralOrder> {
  if (!reason.trim()) throw badRequest('请填写拒绝原因');

  return withTx(async (tx) => {
    const referral = await lockReferral(referralId, tx);
    if (!referral) throw notFound('转诊单不存在');

    const updated = await advanceReferralStatus(
      referralId,
      ['submitted'],
      { status: 'rejected', rejectedReason: reason },
      tx,
    );
    if (!updated) throw conflict('转诊单当前状态不允许拒绝');

    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'referral.reject',
        resourceType: 'referral',
        resourceId: referralId,
        result: 'success',
        riskLevel: 'low',
        detail: { reason },
      },
      tx,
    );

    return updated;
  });
}

/** 完成转诊（accepted -> completed）。 */
export async function completeReferral(
  actor: AuthView,
  referralId: string,
): Promise<ReferralOrder> {
  return withTx(async (tx) => {
    const referral = await lockReferral(referralId, tx);
    if (!referral) throw notFound('转诊单不存在');

    const updated = await advanceReferralStatus(
      referralId,
      ['accepted'],
      { status: 'completed' },
      tx,
    );
    if (!updated) throw conflict('仅已接收的转诊单可完成');

    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'referral.complete',
        resourceType: 'referral',
        resourceId: referralId,
        result: 'success',
        riskLevel: 'low',
        detail: {},
      },
      tx,
    );

    return updated;
  });
}

/** 取消转诊（draft/submitted -> cancelled）。 */
export async function cancelReferral(
  actor: AuthView,
  referralId: string,
): Promise<ReferralOrder> {
  return withTx(async (tx) => {
    const referral = await lockReferral(referralId, tx);
    if (!referral) throw notFound('转诊单不存在');

    const updated = await advanceReferralStatus(
      referralId,
      ['draft', 'submitted'],
      { status: 'cancelled' },
      tx,
    );
    if (!updated) throw conflict('转诊单当前状态不允许取消');

    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'referral.cancel',
        resourceType: 'referral',
        resourceId: referralId,
        result: 'success',
        riskLevel: 'low',
        detail: {},
      },
      tx,
    );

    return updated;
  });
}

/** 转诊详情（含随附资料）。 */
export async function getReferral(
  actor: AuthView,
  id: string,
): Promise<ReferralDetail> {
  const referral = await getReferralById(id);
  if (!referral) throw notFound('转诊单不存在');
  if (!inScope(referral, actor)) throw forbidden('无权查看该转诊单');
  const documents = await listReferralDocuments(id);
  return { referral, documents };
}

/** 转诊列表（数据范围过滤）。 */
export async function listReferralQueue(
  actor: AuthView,
  filter: { direction?: ReferralDirection; status?: ReferralOrder['status'] } = {},
): Promise<ReferralOrder[]> {
  const all = await listReferrals(filter);
  return all.filter((r) => inScope(r, actor));
}
