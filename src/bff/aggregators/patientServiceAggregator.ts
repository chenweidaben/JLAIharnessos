/**
 * 健澜科技 jlmedaios - 患者服务中心聚合器（M142-C · 预防保健与患者服务）
 *
 * 【预防保健与患者服务】患者诉求限时处理，不能石沉大海：
 *   - createServiceTicket：受理一条患者诉求（五类口径），patient_id 脱敏入台账，
 *     初始状态恒为「已创建」，并写入 48h 处理时限 deadlineAt；
 *   - assignServiceTicket：把工单分派给受理人，状态 已创建 → 已分派（处理中）；
 *   - resolveServiceTicket：受理人填写处理结果，状态 已分派 → 已解决；
 *   - submitSatisfaction：患者满意度回访，状态 已解决 → 已关闭，1-5 分留痕；
 *   - scanEscalations：扫描超时工单——48h 未处理一级升级、96h 未处理二级升级，
 *     升级即提醒（纯函数强计算，不依赖定时器，路由/巡检均可调用）。
 *
 * 与全仓聚合器约定一致（同 disputeAggregator）：
 *   - 对外纯函数均为纯计算（校验、组包、状态机、超时判定），不修改入参；
 *   - 进程内台账 tickets 是查询的在读索引；PostgreSQL 为持久化，
 *     落库为 best-effort（断库 / 表未迁移时降级，不阻断受理主流程）；
 *   - 入参非法一律抛错，由路由层收敛为 400 结构化错误信封。
 *
 * 隐私红线：patient_id 在受理瞬间脱敏（P0****23），台账 / 出参 / 落库
 *   全程不接触患者明文标识。
 * 不触碰 WebSocket，不新增依赖（uuid 取自 node 内置 crypto）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型与口径                                                          */
/* ------------------------------------------------------------------ */

/** 诉求类型代码（与 clinical.patient_service_ticket.service_type CHECK 一致） */
export type ServiceType =
  | 'consultation_call'
  | 'complaint_suggestion'
  | 'medical_record_copy'
  | 'diagnosis_proof'
  | 'referral_appointment';

/** 工单状态代码（与 clinical.patient_service_ticket.status CHECK 一致） */
export type ServiceStatus = 'created' | 'assigned' | 'resolved' | 'closed';

/** 类型元数据：代码 → 中文标签 */
const TYPE_META: Readonly<Record<ServiceType, string>> = {
  consultation_call: '咨询电话',
  complaint_suggestion: '投诉建议',
  medical_record_copy: '病历复印',
  diagnosis_proof: '诊断证明',
  referral_appointment: '转诊预约',
};

/** 状态元数据：代码 → 中文标签 */
const STATUS_META: Readonly<Record<ServiceStatus, string>> = {
  created: '已创建',
  assigned: '已分派',
  resolved: '已解决',
  closed: '已关闭',
};

/** 中文标签 → 类型代码（受理接口同时接受代码或中文） */
const TYPE_BY_LABEL: Readonly<Record<string, ServiceType>> = {
  咨询电话: 'consultation_call',
  投诉建议: 'complaint_suggestion',
  病历复印: 'medical_record_copy',
  诊断证明: 'diagnosis_proof',
  转诊预约: 'referral_appointment',
};

/**
 * 【预防保健与患者服务】状态机：合法流转边。
 * 已创建 → 已分派 → 已解决 → 已关闭；终态（已关闭）不可再流转。
 * 保护患者：未分派不得径行解决；未解决不得要求患者回访。
 */
const NEXT_STATUS: Readonly<Record<ServiceStatus, readonly ServiceStatus[]>> = {
  created: ['assigned'],
  assigned: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

/** 限时处理窗口：48 小时（毫秒）。超时未处理即升级提醒。 */
export const SLA_WINDOW_MS = 48 * 60 * 60 * 1000;

/** 二级升级窗口：96 小时（毫秒）。 */
const ESCALATION_LEVEL2_MS = 96 * 60 * 60 * 1000;

/** 一条患者服务工单（BFF 对外形态，camelCase；patientId 已脱敏） */
export interface ServiceTicket {
  /** 工单唯一标识 */
  id: string;
  /** 工单编号（人读） */
  ticketNo: string;
  /** 脱敏患者标识（如 P0****23，全程不存明文） */
  patientId: string;
  /** 诉求类型代码 */
  type: ServiceType;
  /** 诉求类型中文标签（前端列表直显） */
  typeLabel: string;
  /** 患者诉求描述 */
  description: string;
  /** 状态代码 */
  status: ServiceStatus;
  /** 状态中文标签 */
  statusLabel: string;
  /** 受理人标识（未分派为 ''） */
  handlerId: string;
  /** 受理人姓名（未分派为 ''） */
  handlerName: string;
  /** 处理结果（解决时填写） */
  resolution: string;
  /** 满意度回访评分（1-5；0 表示未回访） */
  satisfactionScore: number;
  /** 满意度留言 */
  satisfactionComment: string;
  /** 升级等级：0 正常 / 1 超 48h / 2 超 96h */
  escalationLevel: number;
  /** 应处理时限 ISO 串（createdAt + 48h） */
  deadlineAt: string;
  /** 分派时间 ISO 串（未分派为 ''） */
  assignedAt: string;
  /** 解决时间 ISO 串（未解决为 ''） */
  resolvedAt: string;
  /** 满意度回访时间 ISO 串（未回访为 ''） */
  satisfactionAt: string;
  /** 创建时间 ISO 串 */
  createdAt: string;
  /** 最近更新时间 ISO 串 */
  updatedAt: string;
}

/** createServiceTicket 的可选元数据（测试/回放用） */
export interface TicketMeta {
  /** 覆盖创建时间（测试用）；缺省取当前时钟 */
  createdAt?: string;
}

/* ------------------------------------------------------------------ */
/* 进程内工单台账（查询的在读索引）                                     */
/* ------------------------------------------------------------------ */

const tickets: ServiceTicket[] = [];

/** 宽松收敛为 trim 后字符串 */
function toText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/**
 * 【预防保健与患者服务】患者标识脱敏：保留前 2 位与后 2 位，中间以 **** 代替。
 * 短于 4 位的标识整体打码为 ****，绝不明文入台账。
 */
export function maskPatientId(patientId: string): string {
  const id = toText(patientId);
  if (id.length < 4) return '****';
  return `${id.slice(0, 2)}****${id.slice(-2)}`;
}

/** 生成工单编号：SV + 时间戳 + 6 位随机数 */
function genTicketNo(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `SV${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${Math.floor(100000 + Math.random() * 900000)}`;
}

/** 把诉求类型（代码或中文标签）收敛为代码；非法一律抛错 */
function resolveType(input: unknown): ServiceType {
  const raw = toText(input);
  if (raw in TYPE_META) return raw as ServiceType;
  if (raw in TYPE_BY_LABEL) return TYPE_BY_LABEL[raw];
  throw new Error(
    `诉求类型 type=${raw || '空'} 非法（应为：咨询电话/投诉建议/病历复印/诊断证明/转诊预约）`,
  );
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【预防保健与患者服务】受理一条患者诉求。
 *
 * 校验 → patientId 脱敏 → 组包（48h 时限）→ 写入进程内台账 → 返回工单副本。
 * 受理后初始状态恒为「已创建」，分派交由 assignServiceTicket。
 *
 * @param patientId   患者标识（受理瞬间脱敏，如 P000123 → P0****23）
 * @param type        诉求类型（代码或中文标签）
 * @param description 患者诉求描述
 */
export function createServiceTicket(
  patientId: unknown,
  type: unknown,
  description: unknown,
  meta?: TicketMeta,
): ServiceTicket {
  const rawPatient = toText(patientId);
  if (!rawPatient) throw new Error('患者标识 patientId 不能为空');
  const t = resolveType(type);
  const desc = toText(description).slice(0, 1000);

  const createdAt = meta?.createdAt ?? new Date().toISOString();
  const deadlineAt = new Date(new Date(createdAt).getTime() + SLA_WINDOW_MS).toISOString();

  const ticket: ServiceTicket = {
    id: randomUUID(),
    ticketNo: genTicketNo(),
    patientId: maskPatientId(rawPatient),
    type: t,
    typeLabel: TYPE_META[t],
    description: desc,
    status: 'created',
    statusLabel: STATUS_META.created,
    handlerId: '',
    handlerName: '',
    resolution: '',
    satisfactionScore: 0,
    satisfactionComment: '',
    escalationLevel: 0,
    deadlineAt,
    assignedAt: '',
    resolvedAt: '',
    satisfactionAt: '',
    createdAt,
    updatedAt: createdAt,
  };
  tickets.push(ticket);
  return { ...ticket };
}

/**
 * 【预防保健与患者服务】把工单分派给受理人。
 *
 * 状态机强校验：仅「已创建」可分派，分派后进入「已分派（处理中）」。
 * 已分派 / 已解决 / 已关闭的工单不得重复分派；非法跳变一律抛错。
 *
 * @param ticketId 工单 id
 * @param handlerId 受理人标识
 */
export function assignServiceTicket(
  ticketId: unknown,
  handlerId: unknown,
  handlerName?: unknown,
): ServiceTicket {
  const id = toText(ticketId);
  if (!id) throw new Error('工单 ticketId 不能为空');
  const hId = toText(handlerId);
  if (!hId) throw new Error('受理人 handlerId 不能为空');

  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) throw new Error(`工单 ticketId=${id} 不存在，无法分派`);
  if (ticket.status !== 'created') {
    throw new Error(
      `工单当前为「${ticket.statusLabel}」，仅「${STATUS_META.created}」工单可分派`,
    );
  }

  ticket.status = 'assigned';
  ticket.statusLabel = STATUS_META.assigned;
  ticket.handlerId = hId;
  ticket.handlerName = toText(handlerName) || hId;
  ticket.assignedAt = new Date().toISOString();
  ticket.updatedAt = ticket.assignedAt;
  return { ...ticket };
}

/**
 * 【预防保健与患者服务】受理人填写处理结果，工单 已分派 → 已解决。
 * 终态前必须留下处理结果，患者诉求不得无结论关闭。
 *
 * @param ticketId   工单 id
 * @param resolution 处理结果（必填）
 */
export function resolveServiceTicket(ticketId: unknown, resolution: unknown): ServiceTicket {
  const id = toText(ticketId);
  if (!id) throw new Error('工单 ticketId 不能为空');
  const result = toText(resolution);
  if (!result) throw new Error('处理结果 resolution 不能为空');

  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) throw new Error(`工单 ticketId=${id} 不存在，无法处理`);
  if (ticket.status !== 'assigned') {
    throw new Error(
      `工单当前为「${ticket.statusLabel}」，仅「${STATUS_META.assigned}」工单可处理闭环`,
    );
  }

  ticket.status = 'resolved';
  ticket.statusLabel = STATUS_META.resolved;
  ticket.resolution = result;
  ticket.resolvedAt = new Date().toISOString();
  ticket.updatedAt = ticket.resolvedAt;
  return { ...ticket };
}

/**
 * 【预防保健与患者服务】患者满意度回访，工单 已解决 → 已关闭。
 * 仅「已解决」工单可被回访；评分必须为 1-5 整数。
 *
 * @param ticketId 工单 id
 * @param score   满意度评分（1-5）
 * @param comment 满意度留言（选填）
 */
export function submitSatisfaction(
  ticketId: unknown,
  score: unknown,
  comment?: unknown,
): ServiceTicket {
  const id = toText(ticketId);
  if (!id) throw new Error('工单 ticketId 不能为空');
  const n = typeof score === 'number' ? score : Number(score);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error('满意度评分必须为 1-5 的整数');
  }

  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) throw new Error(`工单 ticketId=${id} 不存在，无法回访`);
  if (ticket.status !== 'resolved') {
    throw new Error(
      `工单当前为「${ticket.statusLabel}」，仅「${STATUS_META.resolved}」工单可满意度回访`,
    );
  }

  ticket.status = 'closed';
  ticket.statusLabel = STATUS_META.closed;
  ticket.satisfactionScore = n;
  ticket.satisfactionComment = toText(comment).slice(0, 500);
  ticket.satisfactionAt = new Date().toISOString();
  ticket.updatedAt = ticket.satisfactionAt;
  return { ...ticket };
}

/**
 * 【预防保健与患者服务】扫描超时工单：48h 未处理一级升级、96h 未处理二级升级。
 *
 * 判定口径：
 *   - 仅「已创建 / 已分派」（未解决）工单参与超时判定；
 *   - 距今 > 96h → escalationLevel = 2（二级升级，院级督办）；
 *   - 距今 > 48h → escalationLevel = 1（一级升级，科室督办）；
 *   - 未超 48h → escalationLevel = 0。
 *
 * 纯函数：在传入时刻 nowMs 上计算并回写台账升级等级，返回本次新升级的工单
 * （即 escalationLevel 由 0 升为 1/2 的件数，供提醒出口消费）。
 *
 * @param nowMs 当前时刻毫秒时间戳（测试可注入）；缺省取 Date.now()
 */
export function scanEscalations(nowMs?: number): ServiceTicket[] {
  const now = typeof nowMs === 'number' && Number.isFinite(nowMs) ? nowMs : Date.now();
  const escalated: ServiceTicket[] = [];

  for (const t of tickets) {
    if (t.status === 'resolved' || t.status === 'closed') continue;
    const createdMs = new Date(t.createdAt).getTime();
    const age = now - createdMs;
    let level = 0;
    if (age > ESCALATION_LEVEL2_MS) level = 2;
    else if (age > SLA_WINDOW_MS) level = 1;

    if (level > t.escalationLevel) {
      t.escalationLevel = level;
      t.updatedAt = new Date(now).toISOString();
      escalated.push({ ...t });
    } else if (level !== t.escalationLevel) {
      // 等级只升不降（已升级的不因时钟回拨而降级）
      t.escalationLevel = Math.max(t.escalationLevel, level);
    }
  }
  return escalated;
}

/* ------------------------------------------------------------------ */
/* 查询                                                                */
/* ------------------------------------------------------------------ */

/** 患者：我的诉求（按脱敏 patientId 过滤，创建时间倒序） */
export function listMyTickets(patientId: unknown): ServiceTicket[] {
  const raw = toText(patientId);
  if (!raw) return [];
  const masked = maskPatientId(raw);
  return tickets
    .filter((t) => t.patientId === masked)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 管理员：全部工单看板（创建时间倒序；可按状态过滤） */
export function listAllTickets(status?: unknown): ServiceTicket[] {
  const want = toText(status);
  return [...tickets]
    .filter((t) => !want || t.status === want)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 测试专用：清空进程内台账，保证用例之间互不污染。 */
export function resetTicketLedger(): void {
  tickets.length = 0;
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断              */
/* ------------------------------------------------------------------ */

/**
 * 把已受理的工单落库到 clinical.patient_service_ticket。
 * 由路由层在 createServiceTicket 之后显式 await；断库 / 表未迁移时静默降级，
 * 进程内台账仍可查询，持久化留待重连后补写。
 */
export async function persistTicket(ticket: ServiceTicket): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.patient_service_ticket
        (id, ticket_no, patient_id, service_type, description, status,
         handler_id, handler_name, resolution, satisfaction_score,
         satisfaction_comment, escalation_level, deadline_at,
         assigned_at, resolved_at, satisfaction_at, created_at, updated_at)
      VALUES
        (${ticket.id}, ${ticket.ticketNo}, ${ticket.patientId}, ${ticket.type},
         ${ticket.description}, ${ticket.status}, ${ticket.handlerId},
         ${ticket.handlerName}, ${ticket.resolution}, ${ticket.satisfactionScore},
         ${ticket.satisfactionComment}, ${ticket.escalationLevel},
         ${ticket.deadlineAt}::timestamptz,
         NULLIF(${ticket.assignedAt}, '')::timestamptz,
         NULLIF(${ticket.resolvedAt}, '')::timestamptz,
         NULLIF(${ticket.satisfactionAt}, '')::timestamptz,
         ${ticket.createdAt}::timestamptz, ${ticket.updatedAt}::timestamptz)
      ON CONFLICT (id) DO NOTHING
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可查询，落库留待重连后补写
  }
}

/**
 * 把工单状态变更（分派 / 处理 / 回访 / 升级）回写 clinical.patient_service_ticket。
 * best-effort，断库降级不阻断。
 */
export async function persistTicketStatus(ticket: ServiceTicket): Promise<void> {
  try {
    const db = getDb();
    await db`
      UPDATE clinical.patient_service_ticket
      SET status = ${ticket.status},
          handler_id = ${ticket.handlerId},
          handler_name = ${ticket.handlerName},
          resolution = ${ticket.resolution},
          satisfaction_score = ${ticket.satisfactionScore},
          satisfaction_comment = ${ticket.satisfactionComment},
          escalation_level = ${ticket.escalationLevel},
          assigned_at = NULLIF(${ticket.assignedAt}, '')::timestamptz,
          resolved_at = NULLIF(${ticket.resolvedAt}, '')::timestamptz,
          satisfaction_at = NULLIF(${ticket.satisfactionAt}, '')::timestamptz,
          updated_at = ${ticket.updatedAt}::timestamptz
      WHERE id = ${ticket.id}
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账状态已生效，回写留待重连后补写
  }
}
