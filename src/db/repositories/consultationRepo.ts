/**
 * 健澜科技 jlmedaios - 互联网问诊 Repository（M3-K）
 *
 * 图文问诊会话 / 消息 读写。
 * 并发：session_no 唯一、未结束会话部分唯一索引（profile+doctor）；
 *      状态推进白名单 + FOR UPDATE 行锁。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

export type ConsultationStatus =
  | 'pending'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'timed_out';

export interface ConsultationSession {
  id: string;
  sessionNo: string;
  accountId: string;
  profileId: string;
  patientId: string;
  doctorId: string | null;
  department: string;
  visitType: 'followup';
  status: ConsultationStatus;
  eligibilityPassed: boolean;
  lastVisitId: string | null;
  lastVisitAt: string | null;
  chiefComplaint: string | null;
  cancelReason: string | null;
  acceptedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationMessage {
  id: string;
  sessionId: string;
  senderType: 'patient' | 'doctor' | 'system';
  senderId: string | null;
  msgType: 'text' | 'image' | 'system';
  content: string;
  createdAt: string;
}

const SESSION_COLS = `
  id, session_no, account_id, profile_id, patient_id, doctor_id, department,
  visit_type, status, eligibility_passed, last_visit_id, last_visit_at,
  chief_complaint, cancel_reason, accepted_at, completed_at, cancelled_at,
  created_at, updated_at
`;

const MESSAGE_COLS = `
  id, session_id, sender_type, sender_id, msg_type, content, created_at
`;

function mapSession(r: Record<string, unknown>): ConsultationSession {
  return {
    id: String(r.id),
    sessionNo: String(r.session_no),
    accountId: String(r.account_id),
    profileId: String(r.profile_id),
    patientId: String(r.patient_id),
    doctorId: r.doctor_id ? String(r.doctor_id) : null,
    department: String(r.department),
    visitType: 'followup',
    status: r.status as ConsultationStatus,
    eligibilityPassed: Boolean(r.eligibility_passed),
    lastVisitId: r.last_visit_id ? String(r.last_visit_id) : null,
    lastVisitAt: r.last_visit_at ? String(r.last_visit_at) : null,
    chiefComplaint: r.chief_complaint ? String(r.chief_complaint) : null,
    cancelReason: r.cancel_reason ? String(r.cancel_reason) : null,
    acceptedAt: r.accepted_at ? String(r.accepted_at) : null,
    completedAt: r.completed_at ? String(r.completed_at) : null,
    cancelledAt: r.cancelled_at ? String(r.cancelled_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapMessage(r: Record<string, unknown>): ConsultationMessage {
  return {
    id: String(r.id),
    sessionId: String(r.session_id),
    senderType: r.sender_type as ConsultationMessage['senderType'],
    senderId: r.sender_id ? String(r.sender_id) : null,
    msgType: r.msg_type as ConsultationMessage['msgType'],
    content: String(r.content),
    createdAt: String(r.created_at),
  };
}

/* ------------------------------------------------------------------ */
/* 会话号                                                              */
/* ------------------------------------------------------------------ */

/** 生成会话号：CONS + yyyyMMddHHmmss + 6 位随机后缀（与院内业务编号一致） */
export function generateSessionNo(now = new Date()): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  const ts =
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `CONS${ts}${suffix}`;
}

/* ------------------------------------------------------------------ */
/* 会话读写                                                            */
/* ------------------------------------------------------------------ */

/** 按 id 取会话（可选行锁） */
export async function getSessionById(
  id: string,
  db?: DbExecutor,
  opts: { lock?: boolean } = {},
): Promise<ConsultationSession | null> {
  const ex = db ?? getDb();
  const tail = opts.lock ? ' FOR UPDATE' : '';
  const rows = await ex.unsafe(
    `SELECT ${SESSION_COLS} FROM clinical.consultation_sessions WHERE id = $1${tail}`,
    [id],
  );
  return rows.length > 0 ? mapSession(rows[0] as Record<string, unknown>) : null;
}

/** 患者账号下的会话列表 */
export async function listSessionsByAccount(
  accountId: string,
  db?: DbExecutor,
): Promise<ConsultationSession[]> {
  const ex = db ?? getDb();
  const rows = await ex`
    SELECT ${ex.unsafe(SESSION_COLS)} FROM clinical.consultation_sessions
     WHERE account_id = ${accountId}
     ORDER BY created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapSession);
}

/** 医生的会话列表（可按状态过滤） */
export async function listSessionsByDoctor(
  doctorId: string,
  status?: ConsultationStatus,
  db?: DbExecutor,
): Promise<ConsultationSession[]> {
  const ex = db ?? getDb();
  const rows = status
    ? await ex`
        SELECT ${ex.unsafe(SESSION_COLS)} FROM clinical.consultation_sessions
         WHERE doctor_id = ${doctorId} AND status = ${status}
         ORDER BY created_at DESC
      `
    : await ex`
        SELECT ${ex.unsafe(SESSION_COLS)} FROM clinical.consultation_sessions
         WHERE doctor_id = ${doctorId}
         ORDER BY created_at DESC
      `;
  return (rows as Record<string, unknown>[]).map(mapSession);
}

/** 待接诊队列（可按科室过滤） */
export async function listPendingSessions(
  department?: string,
  db?: DbExecutor,
): Promise<ConsultationSession[]> {
  const ex = db ?? getDb();
  const rows = department
    ? await ex`
        SELECT ${ex.unsafe(SESSION_COLS)} FROM clinical.consultation_sessions
         WHERE status = 'pending' AND department = ${department}
         ORDER BY created_at ASC
      `
    : await ex`
        SELECT ${ex.unsafe(SESSION_COLS)} FROM clinical.consultation_sessions
         WHERE status = 'pending'
         ORDER BY created_at ASC
      `;
  return (rows as Record<string, unknown>[]).map(mapSession);
}

/** 查找该就诊人对某医生的未结束会话（用于重复发起校验） */
export async function findOpenSession(
  profileId: string,
  doctorId: string,
  db?: DbExecutor,
): Promise<ConsultationSession | null> {
  const ex = db ?? getDb();
  const rows = await ex`
    SELECT ${ex.unsafe(SESSION_COLS)} FROM clinical.consultation_sessions
     WHERE profile_id = ${profileId}
       AND doctor_id = ${doctorId}
       AND status IN ('pending','in_consultation')
     LIMIT 1
  `;
  return rows.length > 0 ? mapSession(rows[0] as Record<string, unknown>) : null;
}

/** 创建会话 */
export async function createSession(
  input: {
    accountId: string;
    profileId: string;
    patientId: string;
    doctorId: string;
    department: string;
    eligibilityPassed: boolean;
    lastVisitId: string | null;
    lastVisitAt: string | null;
    chiefComplaint?: string | null;
  },
  tx: DbExecutor,
): Promise<ConsultationSession> {
  const rows = await tx`
    INSERT INTO clinical.consultation_sessions (
      session_no, account_id, profile_id, patient_id, doctor_id, department,
      status, eligibility_passed, last_visit_id, last_visit_at, chief_complaint
    ) VALUES (
      ${generateSessionNo()}, ${input.accountId}, ${input.profileId},
      ${input.patientId}, ${input.doctorId}, ${input.department},
      'pending', ${input.eligibilityPassed}, ${input.lastVisitId},
      ${input.lastVisitAt}, ${input.chiefComplaint ?? null}
    )
    RETURNING ${tx.unsafe(SESSION_COLS)}
  `;
  return mapSession(rows[0] as Record<string, unknown>);
}

/**
 * 条件式状态推进：仅当当前状态在 fromStatus 白名单内才更新。
 * 返回更新后的会话；状态不匹配返回 null（由聚合器转 409）。
 */
export async function advanceSession(
  id: string,
  fromStatus: ConsultationStatus[],
  patch: Record<string, unknown>,
  tx: DbExecutor,
): Promise<ConsultationSession | null> {
  const keys = Object.keys(patch);
  const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
  const rows = await tx.unsafe(
    `UPDATE clinical.consultation_sessions
       SET ${sets}
     WHERE id = $1 AND status = ANY($2)
     RETURNING ${SESSION_COLS}`,
    [id, fromStatus, ...keys.map((k) => patch[k])],
  );
  return rows.length > 0 ? mapSession(rows[0] as Record<string, unknown>) : null;
}

/* ------------------------------------------------------------------ */
/* 消息读写                                                            */
/* ------------------------------------------------------------------ */

/** 插入消息 */
export async function insertMessage(
  input: {
    sessionId: string;
    senderType: ConsultationMessage['senderType'];
    senderId?: string | null;
    msgType?: ConsultationMessage['msgType'];
    content: string;
  },
  tx: DbExecutor,
): Promise<ConsultationMessage> {
  const rows = await tx`
    INSERT INTO clinical.consultation_messages (
      session_id, sender_type, sender_id, msg_type, content
    ) VALUES (
      ${input.sessionId}, ${input.senderType}, ${input.senderId ?? null},
      ${input.msgType ?? 'text'}, ${input.content}
    )
    RETURNING ${tx.unsafe(MESSAGE_COLS)}
  `;
  return mapMessage(rows[0] as Record<string, unknown>);
}

/** 列出会话消息（按时间升序） */
export async function listMessages(
  sessionId: string,
  db?: DbExecutor,
): Promise<ConsultationMessage[]> {
  const ex = db ?? getDb();
  const rows = await ex`
    SELECT ${ex.unsafe(MESSAGE_COLS)} FROM clinical.consultation_messages
     WHERE session_id = ${sessionId}
     ORDER BY created_at ASC, id ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapMessage);
}

/* ------------------------------------------------------------------ */
/* 复诊资格                                                            */
/* ------------------------------------------------------------------ */

/** 最近一次已完成（出院/结束）历史就诊，用于复诊资格校验 */
export async function getLastCompletedVisit(
  patientId: string,
  db?: DbExecutor,
): Promise<{ id: string; department: string; dischargeAt: string | null } | null> {
  const ex = db ?? getDb();
  const rows = await ex`
    SELECT id, department, discharge_at, admit_at
      FROM clinical.visits
     WHERE patient_id = ${patientId}
       AND status IN ('discharged','transferred')
     ORDER BY COALESCE(discharge_at, admit_at) DESC
     LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: String(r.id),
    department: String(r.department),
    dischargeAt: r.discharge_at ? String(r.discharge_at) : null,
  };
}

/** 可问诊医生（患者端）：已审核线上资质 + 在职用户，join 姓名/职称/科室 */
export interface ConsultableDoctor {
  userId: string;
  name: string;
  title: string | null;
  department: string | null;
  practiceScope: string | null;
  practiceYears: number | null;
}

export async function listConsultableDoctors(
  department?: string,
  db?: DbExecutor,
): Promise<ConsultableDoctor[]> {
  const ex = db ?? getDb();
  const rows = department
    ? await ex`
        SELECT p.user_id, u.name, u.title, u.department,
               p.practice_scope, p.practice_years
          FROM iam.internet_practitioners p
          JOIN iam.users u ON u.id = p.user_id
         WHERE p.audit_status = 'approved'
           AND p.practitioner_type = 'doctor'
           AND u.status = 'active'
           AND u.department = ${department}
         ORDER BY u.name
      `
    : await ex`
        SELECT p.user_id, u.name, u.title, u.department,
               p.practice_scope, p.practice_years
          FROM iam.internet_practitioners p
          JOIN iam.users u ON u.id = p.user_id
         WHERE p.audit_status = 'approved'
           AND p.practitioner_type = 'doctor'
           AND u.status = 'active'
         ORDER BY u.name
      `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    userId: String(r.user_id),
    name: String(r.name),
    title: r.title ? String(r.title) : null,
    department: r.department ? String(r.department) : null,
    practiceScope: r.practice_scope ? String(r.practice_scope) : null,
    practiceYears: r.practice_years ? Number(r.practice_years) : null,
  }));
}
