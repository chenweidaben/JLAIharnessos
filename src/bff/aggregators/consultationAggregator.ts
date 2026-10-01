/**
 * 健澜科技 jlmedaios - 互联网问诊聚合器（M3-K）
 *
 * 复诊图文问诊全流程：
 *  患者发起（实名 + 复诊资格 + 医生资质 + 重复发起校验）
 *   → 医生接诊 → 图文消息 → 医生结束 / 患者取消。
 *
 * 安全：
 *  · 仅复诊、禁止首诊；发起须实名（auth_level≥2）；
 *  · 医生须线上资质 approved；仅接诊医生可回复/结束；
 *  · 患者仅能访问本人账号下会话；AI 不参与问诊写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  getPractitionerByUserId,
  getProfileById,
} from '../../db/repositories/internetPatientRepo.js';
import {
  advanceSession,
  createSession,
  findOpenSession,
  getLastCompletedVisit,
  getSessionById,
  insertMessage,
  listMessages,
  listPendingSessions,
  listSessionsByAccount,
  listSessionsByDoctor,
  listConsultableDoctors,
  type ConsultationSession,
} from '../../db/repositories/consultationRepo.js';

export class ConsultationError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ConsultationError';
  }
}
const badRequest = (m: string) => new ConsultationError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ConsultationError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new ConsultationError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new ConsultationError(409, 'CONFLICT', m);

/* ------------------------------------------------------------------ */
/* 患者端                                                              */
/* ------------------------------------------------------------------ */

/** 患者发起复诊图文问诊 */
export async function startConsultation(
  accountId: string,
  input: { profileId: string; doctorId: string; chiefComplaint?: string },
): Promise<ConsultationSession> {
  if (!input.profileId) throw badRequest('请选择就诊人');
  if (!input.doctorId) throw badRequest('请选择接诊医生');

  // 就诊人归属 + 实名等级
  const profile = await getProfileById(input.profileId);
  if (!profile) throw notFound('就诊人不存在');
  if (profile.accountId !== accountId) throw forbidden('不能为他人就诊人发起问诊');
  if (profile.authLevel < 2 || !profile.patientId) {
    throw forbidden('请先完成实名认证后再发起互联网问诊');
  }

  // 复诊资格：本院存在已完成历史就诊
  const lastVisit = await getLastCompletedVisit(profile.patientId);
  if (!lastVisit) {
    throw forbidden('互联网医院仅提供复诊服务，未查询到本院历史就诊记录，请勿首诊');
  }

  // 医生线上资质
  const practitioner = await getPractitionerByUserId(input.doctorId);
  if (!practitioner || practitioner.auditStatus !== 'approved') {
    throw forbidden('该医生尚未开通互联网诊疗资质或资质未通过审核');
  }

  // 科室：优先医生执业范围，其次历史就诊科室
  const department = practitioner.practiceScope?.trim() || lastVisit.department;

  return withTx(async (tx) => {
    // 重复发起校验（未结束会话）
    const open = await findOpenSession(profile.id, input.doctorId, tx);
    if (open) {
      throw conflict('已存在与该医生的未结束问诊会话，请勿重复发起');
    }

    const session = await createSession(
      {
        accountId,
        profileId: profile.id,
        patientId: profile.patientId!,
        doctorId: input.doctorId,
        department,
        eligibilityPassed: true,
        lastVisitId: lastVisit.id,
        lastVisitAt: lastVisit.dischargeAt,
        chiefComplaint: input.chiefComplaint?.trim() || null,
      },
      tx,
    );

    await insertMessage(
      {
        sessionId: session.id,
        senderType: 'system',
        msgType: 'system',
        content: '复诊问诊已发起，等待医生接诊。',
      },
      tx,
    );

    await recordChainAudit(
      {
        actorId: accountId,
        action: 'internet.consultation_start',
        resourceType: 'consultation_session',
        resourceId: session.id,
        result: 'success',
        riskLevel: 'medium',
        detail: { doctorId: input.doctorId, department, lastVisitId: lastVisit.id },
      },
      tx,
    );

    return session;
  });
}

/** 患者：我的会话列表 */
export async function listMySessions(accountId: string): Promise<ConsultationSession[]> {
  return listSessionsByAccount(accountId);
}

/** 患者：可问诊医生列表（仅已审核线上资质医生） */
export async function listDoctorsForPatient(department?: string) {
  return listConsultableDoctors(department);
}

/** 校验会话归属（患者账号），返回会话 */
async function requireOwnedSession(
  accountId: string,
  sessionId: string,
): Promise<ConsultationSession> {
  const session = await getSessionById(sessionId);
  if (!session) throw notFound('问诊会话不存在');
  if (session.accountId !== accountId) throw forbidden('不能访问他人问诊会话');
  return session;
}

/** 患者：会话详情（含消息） */
export async function getMySession(
  accountId: string,
  sessionId: string,
): Promise<{ session: ConsultationSession; messages: Awaited<ReturnType<typeof listMessages>> }> {
  const session = await requireOwnedSession(accountId, sessionId);
  const messages = await listMessages(sessionId);
  return { session, messages };
}

/** 患者：发送消息（仅问诊中） */
export async function patientSendMessage(
  accountId: string,
  sessionId: string,
  input: { content: string; msgType?: 'text' | 'image' },
): Promise<{ id: string; createdAt: string }> {
  if (!input.content?.trim()) throw badRequest('消息内容不能为空');
  const session = await requireOwnedSession(accountId, sessionId);
  if (session.status !== 'in_consultation') {
    throw conflict(`仅问诊中可发送消息，当前状态 ${session.status}`);
  }
  return withTx(async (tx) => {
    const msg = await insertMessage(
      {
        sessionId,
        senderType: 'patient',
        senderId: accountId,
        msgType: input.msgType ?? 'text',
        content: input.content.trim(),
      },
      tx,
    );
    return { id: msg.id, createdAt: msg.createdAt };
  });
}

/** 患者：取消会话（待接诊/问诊中） */
export async function patientCancel(
  accountId: string,
  sessionId: string,
  input: { reason?: string },
): Promise<ConsultationSession> {
  const session = await requireOwnedSession(accountId, sessionId);
  if (session.status !== 'pending' && session.status !== 'in_consultation') {
    throw conflict(`仅待接诊/问诊中会话可取消，当前状态 ${session.status}`);
  }
  return withTx(async (tx) => {
    const updated = await advanceSession(
      sessionId,
      ['pending', 'in_consultation'],
      {
        status: 'cancelled',
        cancel_reason: input.reason?.trim() ?? null,
        cancelled_at: new Date(),
      },
      tx,
    );
    if (!updated) throw conflict('会话状态已变化，取消失败');
    await insertMessage(
      {
        sessionId,
        senderType: 'system',
        msgType: 'system',
        content: '患者已取消本次问诊。',
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: accountId,
        action: 'internet.consultation_cancel',
        resourceType: 'consultation_session',
        resourceId: sessionId,
        result: 'success',
        riskLevel: 'low',
      },
      tx,
    );
    return updated;
  });
}

/* ------------------------------------------------------------------ */
/* 医生端                                                              */
/* ------------------------------------------------------------------ */

/** 医生：待接诊队列 */
export async function listPending(department?: string): Promise<ConsultationSession[]> {
  return listPendingSessions(department);
}

/** 医生：我的会话列表 */
export async function listDoctorSessions(
  doctorId: string,
  status?: ConsultationSession['status'],
): Promise<ConsultationSession[]> {
  return listSessionsByDoctor(doctorId, status);
}

/** 医生：接诊（pending → in_consultation） */
export async function acceptSession(
  doctorId: string,
  sessionId: string,
): Promise<ConsultationSession> {
  return withTx(async (tx) => {
    const session = await getSessionById(sessionId, tx, { lock: true });
    if (!session) throw notFound('问诊会话不存在');
    if (session.doctorId !== doctorId) throw forbidden('该会话未指派给您，不能接诊');
    if (session.status !== 'pending') {
      throw conflict(`仅待接诊会话可接诊，当前状态 ${session.status}`);
    }
    const updated = await advanceSession(
      sessionId,
      ['pending'],
      { status: 'in_consultation', accepted_at: new Date() },
      tx,
    );
    if (!updated) throw conflict('会话状态已变化，接诊失败');
    await insertMessage(
      {
        sessionId,
        senderType: 'system',
        msgType: 'system',
        content: '医生已接诊，请描述您的病情。',
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: doctorId,
        action: 'internet.consultation_accept',
        resourceType: 'consultation_session',
        resourceId: sessionId,
        result: 'success',
        riskLevel: 'medium',
      },
      tx,
    );
    return updated;
  });
}

/** 医生：发送消息（仅问诊中，仅接诊医生） */
export async function doctorSendMessage(
  doctorId: string,
  sessionId: string,
  input: { content: string; msgType?: 'text' | 'image' },
): Promise<{ id: string; createdAt: string }> {
  if (!input.content?.trim()) throw badRequest('消息内容不能为空');
  const session = await getSessionById(sessionId);
  if (!session) throw notFound('问诊会话不存在');
  if (session.doctorId !== doctorId) throw forbidden('仅接诊医生可回复该会话');
  if (session.status !== 'in_consultation') {
    throw conflict(`仅问诊中可发送消息，当前状态 ${session.status}`);
  }
  return withTx(async (tx) => {
    const msg = await insertMessage(
      {
        sessionId,
        senderType: 'doctor',
        senderId: doctorId,
        msgType: input.msgType ?? 'text',
        content: input.content.trim(),
      },
      tx,
    );
    return { id: msg.id, createdAt: msg.createdAt };
  });
}

/** 医生：结束问诊（in_consultation → completed） */
export async function completeSession(
  doctorId: string,
  sessionId: string,
): Promise<ConsultationSession> {
  return withTx(async (tx) => {
    const session = await getSessionById(sessionId, tx, { lock: true });
    if (!session) throw notFound('问诊会话不存在');
    if (session.doctorId !== doctorId) throw forbidden('仅接诊医生可结束该会话');
    if (session.status !== 'in_consultation') {
      throw conflict(`仅问诊中会话可结束，当前状态 ${session.status}`);
    }
    const updated = await advanceSession(
      sessionId,
      ['in_consultation'],
      { status: 'completed', completed_at: new Date() },
      tx,
    );
    if (!updated) throw conflict('会话状态已变化，结束失败');
    await insertMessage(
      {
        sessionId,
        senderType: 'system',
        msgType: 'system',
        content: '本次问诊已结束。感谢您的信任，祝您早日康复。',
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: doctorId,
        action: 'internet.consultation_complete',
        resourceType: 'consultation_session',
        resourceId: sessionId,
        result: 'success',
        riskLevel: 'medium',
      },
      tx,
    );
    return updated;
  });
}
