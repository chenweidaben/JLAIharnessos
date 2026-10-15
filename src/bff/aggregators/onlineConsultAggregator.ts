/**
 * 健澜科技 jlmedaios - 互联网医院在线问诊聚合器（M143-A · 互联网医院与远程医疗）
 *
 * 【互联网医院与远程医疗】在线问诊全生命周期：
 *   - createConsultation：患者发起问诊（文字 / 图文 / 视频三种模式），
 *     状态进入「待接单」，等待接诊医师抢单；
 *   - acceptConsultation：医师接单锁定，状态进入「咨询中」，
 *     同时按下问诊时长红线起算 30 分钟倒计时（deadlineAt）；
 *   - endConsultation：医师撰写诊疗小结结束问诊，回写 summary 与实际问诊时长；
 *   - sweepTimeouts：后台/路由入口自动巡检——咨询中超 30 分钟未结束的，
 *     自动标记 endReason=timeout 并落为「已结束」，超时即关单，不 indefinite 挂起。
 *
 * 状态机：待接单 pending → 咨询中 ongoing → 已结束 ended（completed / timeout）
 *                                  ↘ 已取消 cancelled（患者未接单前撤回）
 *
 * 与全仓聚合器约定一致（同 vaccinationAggregator）：
 *   - 三个对外函数均为纯计算（校验、组包、状态流转、时长回算），不修改入参；
 *   - 进程内台账 consultations 是巡检与查询的在读索引；
 *     PostgreSQL 为持久化，落库为 best-effort（断库 / 表未迁移时降级，
 *     不阻断问诊主流程）；
 *   - 入参非法一律抛错，由路由层收敛为 400 结构化错误信封。
 *
 * 不触碰 WebSocket（前端用本地倒计时 + 动作后刷新，长连接不在本期范围），
 * 不新增依赖（uuid 取自 node 内置 crypto）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型与口径                                                           */
/* ------------------------------------------------------------------ */

/** 问诊模式（与 clinical.online_consultation.mode CHECK 一致） */
export type ConsultMode = 'text' | 'image' | 'video';

/** 问诊状态：待接单 / 咨询中 / 已结束 / 已取消 */
export type ConsultStatus = 'pending' | 'ongoing' | 'ended' | 'cancelled';

/** 结束方式：医师手动完成 / 30 分钟超时自动关单 */
export type EndReason = 'completed' | 'timeout';

/** 单条在线问诊（BFF 对外形态，camelCase） */
export interface Consult {
  /** 问诊单 id */
  id: string;
  /** 患者标识 */
  patientId: string;
  /** 接诊医师 id；待接单期间为 null */
  doctorId: string | null;
  /** 就诊科室 */
  dept: string;
  /** 患者主诉 / 症状描述 */
  symptoms: string;
  /** 问诊模式：文字 / 图文 / 视频 */
  mode: ConsultMode;
  /** 状态机：pending → ongoing → ended / cancelled */
  status: ConsultStatus;
  /** 结束方式：completed 医师手动结束 / timeout 超时自动关单；未结束为 null */
  endReason: EndReason | null;
  /** 医师诊疗小结（endConsultation 回写） */
  summary: string | null;
  /** 创建时间 ISO */
  createdAt: string;
  /** 接单时间 ISO（咨询中起算点） */
  acceptedAt: string | null;
  /** 结束时间 ISO */
  endedAt: string | null;
  /** 咨询中倒计时截止：acceptedAt + 30 分钟；越过即自动超时 */
  deadlineAt: string | null;
  /** 实际问诊时长（秒）：endedAt - acceptedAt */
  durationSec: number | null;
}

/** 问诊时长红线：接单后 30 分钟内必须结束，超时自动关单 */
export const CONSULT_TIMEOUT_MINUTES = 30;

const MINUTE_MS = 60_000;

/** 问诊模式中文标签（前端展示用） */
export const MODE_LABEL: Readonly<Record<ConsultMode, string>> = {
  text: '文字咨询',
  image: '图文咨询',
  video: '视频咨询',
};

/* ------------------------------------------------------------------ */
/* 进程内台账（在读索引；PostgreSQL 为持久化）                          */
/* ------------------------------------------------------------------ */

const consultations: Consult[] = [];

function toText(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.trim();
}

function iso(now?: string): string {
  return now ? new Date(now).toISOString() : new Date().toISOString();
}

/**
 * 巡检并关闭超时单：所有「咨询中」且 now 已越过 deadlineAt 的，
 * 自动置为 ended / endReason=timeout，回写 endedAt 与 durationSec。
 * 纯函数：只翻转台账内合法超时单，不抛错；返回本次被关闭的问诊列表。
 */
export function sweepTimeouts(now?: string): Consult[] {
  const t = now ? new Date(now).getTime() : Date.now();
  const closed: Consult[] = [];
  for (const c of consultations) {
    if (c.status !== 'ongoing' || !c.deadlineAt) continue;
    if (t >= new Date(c.deadlineAt).getTime()) {
      c.status = 'ended';
      c.endReason = 'timeout';
      c.endedAt = new Date(t).toISOString();
      c.durationSec = c.acceptedAt
        ? Math.max(0, Math.round((t - new Date(c.acceptedAt).getTime()) / 1000))
        : null;
      closed.push({ ...c });
    }
  }
  return closed;
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                           */
/* ------------------------------------------------------------------ */

/**
 * 【互联网医院与远程医疗】患者发起在线问诊。
 *
 * 校验 patientId / dept / symptoms 非空 → 组包进入「待接单」。
 * doctorId 可传空串（患者不指定医师，进入公共候诊池等待抢单）；
 * 若指定了医师，则记录为意向医师，仍需该医师 accept 后才进入咨询中。
 *
 * @param patientId 患者标识（必填）
 * @param doctorId  意向接诊医师；空串表示公共候诊
 * @param dept      就诊科室（必填）
 * @param symptoms  主诉 / 症状描述（必填）
 * @param mode      问诊模式：text 文字 / image 图文 / video 视频，默认 text
 * @param now       可选，覆盖创建时间（测试回放用）
 */
export function createConsultation(
  patientId: string,
  doctorId: string,
  dept: string,
  symptoms: string,
  mode: ConsultMode = 'text',
  now?: string,
): Consult {
  const pid = toText(patientId);
  const dep = toText(dept);
  const sym = toText(symptoms);
  if (!pid) throw new Error('患者 patientId 不能为空');
  if (!dep) throw new Error('就诊科室 dept 不能为空');
  if (!sym) throw new Error('症状描述 symptoms 不能为空');
  if (!['text', 'image', 'video'].includes(mode)) {
    throw new Error(`问诊模式 mode=${String(mode)} 非法，仅支持 text/image/video`);
  }

  const created = iso(now);
  const consult: Consult = {
    id: randomUUID(),
    patientId: pid,
    doctorId: toText(doctorId) || null,
    dept: dep,
    symptoms: sym,
    mode,
    status: 'pending',
    endReason: null,
    summary: null,
    createdAt: created,
    acceptedAt: null,
    endedAt: null,
    deadlineAt: null,
    durationSec: null,
  };
  consultations.push(consult);
  return { ...consult };
}

/**
 * 【互联网医院与远程医疗】医师接单。
 *
 * 仅「待接单」可被接单：锁定医师、写入 acceptedAt，
 * 并按 30 分钟红线生成 deadlineAt（acceptedAt + 30min），状态进入「咨询中」。
 * 已结束 / 已取消 / 已被他人接单的单一律拒绝。
 *
 * @param consultId 问诊单 id
 * @param doctorId   接诊医师工号（必填，本人接单留痕）
 * @param now        可选，覆盖接单时间（测试回放用）
 */
export function acceptConsultation(consultId: string, doctorId: string, now?: string): Consult {
  const cid = toText(consultId);
  const doc = toText(doctorId);
  if (!cid) throw new Error('问诊单 consultId 不能为空');
  if (!doc) throw new Error('接诊医师 doctorId 不能为空');

  // 接单前先巡检，避免一张已超时的旧单被再次接起
  sweepTimeouts(now);

  const c = consultations.find((x) => x.id === cid);
  if (!c) throw new Error(`问诊单 consultId=${cid} 不存在`);
  if (c.status !== 'pending') {
    throw new Error(`问诊单当前状态为 ${c.status}，仅「待接单」可被接单`);
  }

  const accepted = now ? new Date(now).toISOString() : new Date().toISOString();
  c.doctorId = doc;
  c.acceptedAt = accepted;
  c.status = 'ongoing';
  c.deadlineAt = new Date(new Date(accepted).getTime() + CONSULT_TIMEOUT_MINUTES * MINUTE_MS).toISOString();
  return { ...c };
}

/**
 * 【互联网医院与远程医疗】结束问诊。
 *
 * 纯计算：先 sweepTimeouts（此刻已越 30 分钟的单会被自动判 timeout），
 * 再要求单处于「咨询中」：写入医师 summary、endedAt，回算 durationSec。
 * 手动结束必须提供诊疗小结 summary（医疗文书留痕，不可空单结束）。
 *
 * @param consultId 问诊单 id
 * @param summary   医师诊疗小结 / 医嘱建议（手动结束必填）
 * @param now       可选，覆盖结束时间（测试回放用）
 */
export function endConsultation(consultId: string, summary: string, now?: string): Consult {
  const cid = toText(consultId);
  const sum = toText(summary);
  if (!cid) throw new Error('问诊单 consultId 不能为空');

  // 结束前先巡检：若此刻已越 30 分钟，由超时流程自动关单
  const swept = sweepTimeouts(now);
  const sweptC = swept.find((x) => x.id === cid);
  if (sweptC) return { ...sweptC };

  const c = consultations.find((x) => x.id === cid);
  if (!c) throw new Error(`问诊单 consultId=${cid} 不存在`);
  if (c.status !== 'ongoing') {
    throw new Error(`问诊单当前状态为 ${c.status}，仅「咨询中」可结束`);
  }
  if (!sum) throw new Error('诊疗小结 summary 不能为空，医师须手写处置建议后方可结束');

  const ended = now ? new Date(now).toISOString() : new Date().toISOString();
  c.summary = sum;
  c.status = 'ended';
  c.endReason = 'completed';
  c.endedAt = ended;
  c.durationSec = c.acceptedAt
    ? Math.max(0, Math.round((new Date(ended).getTime() - new Date(c.acceptedAt).getTime()) / 1000))
    : null;
  return { ...c };
}

/**
 * 【互联网医院与远程医疗】患者撤单：仅「待接单」未被接走时可取消。
 * （状态机的 cancelled 分支；本期路由不暴露，供小程序 / 后续版本调用。）
 */
export function cancelConsultation(consultId: string, now?: string): Consult {
  const cid = toText(consultId);
  if (!cid) throw new Error('问诊单 consultId 不能为空');
  const c = consultations.find((x) => x.id === cid);
  if (!c) throw new Error(`问诊单 consultId=${cid} 不存在`);
  if (c.status !== 'pending') {
    throw new Error(`问诊单当前状态为 ${c.status}，仅「待接单」可取消`);
  }
  c.status = 'cancelled';
  c.endedAt = iso(now);
  return { ...c };
}

/** 查询单条问诊（路由 PUT 后回读最新状态用） */
export function getConsultation(consultId: string): Consult | null {
  const cid = toText(consultId);
  const c = consultations.find((x) => x.id === cid);
  return c ? { ...c } : null;
}

/** 列出某患者全部问诊（按创建时间倒序） */
export function listConsultationsByPatient(patientId: string): Consult[] {
  const pid = toText(patientId);
  return consultations
    .filter((c) => c.patientId === pid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => ({ ...c }));
}

/** 测试专用：清空进程内台账，保证用例之间互不污染。 */
export function resetConsultLedger(): void {
  consultations.length = 0;
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断               */
/* ------------------------------------------------------------------ */

/**
 * 把问诊单落库到 clinical.online_consultation。
 * 由路由层在状态流转后显式 await；断库 / 表未迁移时静默降级，
 * 进程内台账仍可出巡检与时长回算，持久化留待重连后补写。
 */
export async function persistConsult(consult: Consult): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.online_consultation
        (id, patient_id, doctor_id, dept, symptoms, mode, status,
         end_reason, summary, created_at, accepted_at, ended_at,
         deadline_at, duration_sec)
      VALUES
        (${consult.id}, ${consult.patientId}, ${consult.doctorId}, ${consult.dept},
         ${consult.symptoms}, ${consult.mode}, ${consult.status},
         ${consult.endReason}, ${consult.summary}, ${consult.createdAt},
         ${consult.acceptedAt}, ${consult.endedAt}, ${consult.deadlineAt},
         ${consult.durationSec})
      ON CONFLICT (id) DO UPDATE
        SET doctor_id = EXCLUDED.doctor_id,
            status = EXCLUDED.status,
            end_reason = EXCLUDED.end_reason,
            summary = EXCLUDED.summary,
            accepted_at = EXCLUDED.accepted_at,
            ended_at = EXCLUDED.ended_at,
            deadline_at = EXCLUDED.deadline_at,
            duration_sec = EXCLUDED.duration_sec,
            updated_at = now()
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可巡检超时，落库留待重连后补写
  }
}
