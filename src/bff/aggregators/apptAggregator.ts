/**
 * 健澜科技 jlmedaios - 预约随访聚合器（M3-I）
 *
 * 预约状态机：scheduled -> confirmed -> completed / absent；scheduled -> cancelled。
 * 随访计划 pending -> completed（记录随访结果后）。
 * AI 仅辅助，不自主诊疗。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  createAppointment,
  getApptById,
  lockAppt,
  listAppts,
  patchAppt,
  createPlan,
  getPlanById,
  lockPlan,
  listPlans,
  recordFollowUp,
  type Appointment,
  type FollowUpPlan,
} from '../../db/repositories/apptRepo.js';

export class ApptError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApptError';
  }
}
const badRequest = (m: string) => new ApptError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ApptError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new ApptError(409, 'CONFLICT', m);

const APPT_TRANSITIONS: Record<Appointment['status'], Appointment['status'][]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'absent'],
  completed: [],
  absent: [],
  cancelled: [],
};

export async function submitAppointment(auth: AuthView, input: {
  appointmentNo: string;
  patientId: string;
  scheduledAt: string;
  department?: string;
  purpose: string;
}): Promise<{ appt: Appointment; created: boolean }> {
  if (!input.purpose?.trim()) throw badRequest('就诊目的不能为空');
  if (!input.scheduledAt) throw badRequest('预约时间不能为空');
  return withTx(async (tx) => {
    const r = await createAppointment({ ...input, createdBy: auth.id }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'appt.submit', resourceType: 'appointment',
      resourceId: r.appt.id, result: 'success', riskLevel: 'low',
      detail: { no: r.appt.appointmentNo, created: r.created },
    }, tx);
    return r;
  });
}

export async function listAppointments(): Promise<Appointment[]> {
  return listAppts();
}

export async function confirmAppointment(id: string, auth: AuthView, visitId?: string): Promise<Appointment> {
  return withTx(async (tx) => {
    const locked = await lockAppt(id, tx);
    if (!locked) throw notFound('预约不存在');
    if (!APPT_TRANSITIONS[locked.status].includes('confirmed')) {
      throw conflict(`非法状态转换：${locked.status} -> confirmed`);
    }
    const updated = await patchAppt(id, { status: 'confirmed', visit_id: visitId ?? locked.visitId }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'appt.confirm', resourceType: 'appointment', resourceId: id,
      result: 'success', riskLevel: 'low',
    }, tx);
    return updated;
  });
}

export async function completeAppointment(id: string, auth: AuthView, outcome: 'completed' | 'absent'): Promise<Appointment> {
  return withTx(async (tx) => {
    const locked = await lockAppt(id, tx);
    if (!locked) throw notFound('预约不存在');
    if (!APPT_TRANSITIONS[locked.status].includes(outcome)) {
      throw conflict(`非法状态转换：${locked.status} -> ${outcome}`);
    }
    const updated = await patchAppt(id, { status: outcome }, tx);
    await recordChainAudit({
      actorId: auth.id, action: `appt.${outcome}`, resourceType: 'appointment', resourceId: id,
      result: 'success', riskLevel: 'low',
    }, tx);
    return updated;
  });
}

export async function cancelAppointment(id: string, auth: AuthView, reason: string): Promise<Appointment> {
  if (!reason?.trim()) throw badRequest('取消原因不能为空');
  return withTx(async (tx) => {
    const locked = await lockAppt(id, tx);
    if (!locked) throw notFound('预约不存在');
    if (!APPT_TRANSITIONS[locked.status].includes('cancelled')) {
      throw conflict(`非法状态转换：${locked.status} -> cancelled`);
    }
    const updated = await patchAppt(id, { status: 'cancelled', cancel_reason: reason.trim() }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'appt.cancel', resourceType: 'appointment', resourceId: id,
      result: 'success', riskLevel: 'low',
    }, tx);
    return updated;
  });
}

export async function createFollowUpPlan(auth: AuthView, input: {
  planNo: string;
  patientId: string;
  appointmentId?: string | null;
  scheduledDate: string;
  content: string;
}): Promise<FollowUpPlan> {
  if (!input.content?.trim()) throw badRequest('随访内容不能为空');
  return withTx(async (tx) => {
    const plan = await createPlan({ ...input, createdBy: auth.id }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'appt.followup_plan', resourceType: 'follow_up_plan',
      resourceId: plan.id, result: 'success', riskLevel: 'low',
    }, tx);
    return plan;
  });
}

export async function listFollowUpPlans(): Promise<FollowUpPlan[]> {
  return listPlans();
}

/** 记录随访结果：pending -> completed。AI 仅辅助，须医师复核。 */
export async function recordFollowUpResult(
  planId: string,
  auth: AuthView,
  input: { outcome: string; note?: string },
): Promise<FollowUpPlan> {
  if (!input.outcome?.trim()) throw badRequest('随访结果不能为空');
  return withTx(async (tx) => {
    const locked = await lockPlan(planId, tx);
    if (!locked) throw notFound('随访计划不存在');
    if (locked.status !== 'pending') throw conflict('仅待随访(pending)计划可记录结果');
    await recordFollowUp(planId, input.outcome.trim(), input.note ?? null, auth.id, tx);
    const updated = await getPlanById(planId, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'appt.followup_record', resourceType: 'follow_up_plan',
      resourceId: planId, result: 'success', riskLevel: 'low',
    }, tx);
    return updated!;
  });
}
