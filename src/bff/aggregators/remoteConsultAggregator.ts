/**
 * 健澜科技 jlmedaios - 远程会诊聚合器（M143-B · 互联网医院与远程医疗）
 *
 * 【互联网医院与远程医疗】打破院内围墙，三类会诊统一台账：
 *   - requestRemoteConsultation：发起会诊。按受邀机构自动判别类型——
 *       院内（expertHospital 为空 / 含「院内」）→ mdt 院内多学科，
 *       含「国际 / 海外 / 境外」→ international 国际远程，
 *       其余 → inter_hospital 院间远程；
 *     reason 命中「急」即标记 urgent=true，acceptDeadlineAt = 申请时刻 + 2h；
 *   - acceptRemoteConsultation：受邀专家接受会诊。MDT 逐位接受，全部接受后整体
 *       进入 accepted；院间 / 国际单一专家接受即进入 accepted；
 *   - submitRemoteReport：专家提交会诊报告（必须先 accepted），状态进入 reported。
 *
 * 时效性红线：急会诊 2 小时内响应。listRemoteConsults(now) 会扫描所有仍处于
 *   requested 的急会诊单，超过 acceptDeadlineAt 未接受即置 escalated=true 并生成
 *   升级提醒文案，由调度台 / 短信 / 公众号加急催办。
 *
 * 与全仓聚合器约定一致（同 vaccinationAggregator）：
 *   - 三个对外函数均为纯计算（校验、组包、状态流转），不修改入参；
 *   - 进程内台账 consults 是查询与时效升级的在读索引；PostgreSQL 为持久化，
 *     落库为 best-effort（断库 / 表未迁移时降级，不阻断会诊主流程）；
 *   - 入参非法一律抛错，由路由层收敛为 400 结构化错误信封。
 *
 * 不触碰 WebSocket，不新增依赖（uuid 取自 node 内置 crypto）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型与口径                                                           */
/* ------------------------------------------------------------------ */

/** 会诊类型（与 clinical.remote_consultation.consult_type CHECK 一致） */
export type ConsultType = 'mdt' | 'inter_hospital' | 'international';

/** 会诊状态机：已申请待接受 → 专家已接受 → 已提交报告 */
export type ConsultStatus = 'requested' | 'accepted' | 'reported';

/** 急会诊响应时限（业务红线：2 小时内必须有专家接受） */
export const URGENT_RESPONSE_HOURS = 2;

/** 会诊单（BFF 对外形态，camelCase） */
export interface Consult {
  /** 会诊单唯一标识 */
  id: string;
  /** 会诊类型代码 */
  consultType: ConsultType;
  /** 会诊类型中文标签（前端看板直接展示） */
  consultTypeLabel: string;
  /** 申请科室 */
  reqDept: string;
  /** 申请医生 */
  reqDoctor: string;
  /** 患者标识 */
  patientId: string;
  /** 会诊原因 / 病情摘要 */
  reason: string;
  /** 受邀机构（院内 MDT 为空） */
  expertHospital: string;
  /** 受邀专家名单（MDT 多人；院间 / 国际为单元素） */
  experts: string[];
  /** 已接受专家名单 */
  acceptedExperts: string[];
  /** 是否急会诊（2h 内响应） */
  urgent: boolean;
  /** 会诊状态 */
  status: ConsultStatus;
  /** 申请时间 ISO 串 */
  requestedAt: string;
  /** 急会诊接受时限（申请时刻 + 2h） */
  acceptDeadlineAt: string;
  /** 专家接受时间 ISO 串 */
  acceptedAt?: string;
  /** 最终接受专家（院间 / 国际）或 MDT 全部接受时间 */
  acceptedBy?: string;
  /** 会诊报告正文 */
  report?: string;
  /** 报告提交时间 ISO 串 */
  reportedAt?: string;
  /** 急会诊超 2h 未接受，已自动升级提醒 */
  escalated: boolean;
  /** 升级提醒文案（escalated=true 时） */
  escalationMessage?: string;
}

/* ------------------------------------------------------------------ */
/* 进程内会诊台账（查询与时效升级的在读索引）                           */
/* ------------------------------------------------------------------ */

const consults: Consult[] = [];

/** 宽松收敛为 trim 后字符串 */
function toText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/** 解析当前时刻（now 可覆盖，便于测试回放） */
function nowDate(now?: string): Date {
  return now ? new Date(now) : new Date();
}

/** ISO 串加减 n 小时 */
function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3600000).toISOString();
}

/** 把专家字段拆分为名单：支持逗号 / 顿号 / 分号 / 中文逗号分隔（MDT 多人） */
function splitExperts(expertDoctor: string): string[] {
  return expertDoctor
    .split(/[,，、;；]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 【互联网医院与远程医疗】按受邀机构自动判别会诊类型。
 *   expertHospital 为空 / 含「院内」        → mdt 院内多学科会诊；
 *   含「国际 / 海外 / 境外 / 跨境」        → international 国际远程会诊；
 *   其余（有外院机构名）                    → inter_hospital 院间远程会诊。
 */
function inferConsultType(expertHospital: string): ConsultType {
  const h = expertHospital.toLowerCase();
  if (!expertHospital || h.includes('院内') || h.includes('本院')) return 'mdt';
  if (h.includes('国际') || h.includes('海外') || h.includes('境外') || h.includes('跨境')) {
    return 'international';
  }
  return 'inter_hospital';
}

const TYPE_LABEL: Record<ConsultType, string> = {
  mdt: '院内多学科会诊',
  inter_hospital: '院间远程会诊',
  international: '国际远程会诊',
};

/** reason 命中「急」即视为急会诊（急会诊 2 小时内响应） */
function inferUrgent(reason: string): boolean {
  return /急|urgent/i.test(reason);
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【互联网医院与远程医疗】发起一张远程会诊单。
 *
 * 组包 → 校验必填 → 按受邀机构判别会诊类型 → 拆专家名单 → 计算急会诊 2h 时限 →
 * 写入进程内台账 → 返回会诊单副本。
 *
 * @param reqDept        申请科室
 * @param reqDoctor      申请医生
 * @param patientId      患者标识
 * @param reason         会诊原因 / 病情摘要（含「急」即急会诊）
 * @param expertHospital 受邀机构（院内 MDT 传空；国际会诊传含「国际」字样机构名）
 * @param expertDoctor   受邀专家（MDT 可传「张主任,李主任」多人）
 * @param now            可选，覆盖申请时间（测试回放用）
 */
export function requestRemoteConsultation(
  reqDept: string,
  reqDoctor: string,
  patientId: string,
  reason: string,
  expertHospital: string,
  expertDoctor: string,
  now?: string,
): Consult {
  const dept = toText(reqDept);
  const doctor = toText(reqDoctor);
  const pid = toText(patientId);
  const text = toText(reason);
  const hospital = toText(expertHospital);
  const expertField = toText(expertDoctor);

  if (!dept) throw new Error('申请科室 reqDept 不能为空');
  if (!doctor) throw new Error('申请医生 reqDoctor 不能为空');
  if (!pid) throw new Error('患者 patientId 不能为空');
  if (!text) throw new Error('会诊原因 reason 不能为空');
  if (!expertField) throw new Error('受邀专家 expertDoctor 不能为空');

  const type = inferConsultType(hospital);
  const experts = splitExperts(expertField);
  if (experts.length === 0) throw new Error('受邀专家名单为空，请至少指定一位专家');

  const urgent = inferUrgent(text);
  const requestedAt = nowDate(now).toISOString();

  const consult: Consult = {
    id: randomUUID(),
    consultType: type,
    consultTypeLabel: TYPE_LABEL[type],
    reqDept: dept,
    reqDoctor: doctor,
    patientId: pid,
    reason: text,
    expertHospital: hospital,
    experts,
    acceptedExperts: [],
    urgent,
    status: 'requested',
    requestedAt,
    acceptDeadlineAt: addHours(requestedAt, URGENT_RESPONSE_HOURS),
    escalated: false,
  };
  consults.push(consult);
  return cloneConsult(consult);
}

/**
 * 【互联网医院与远程医疗】受邀专家接受会诊。
 *
 * 校验会诊单存在且未提交报告 → 校验该专家确在受邀名单内 → 加入已接受名单：
 *   - 院间 / 国际（单专家）：接受即整体进入 accepted；
 *   - MDT（多专家）：全部受邀专家都接受后才整体进入 accepted。
 *
 * @param consultId   会诊单 id
 * @param expertDoctor 接受会诊的专家姓名（须在受邀名单内）
 * @param now         可选，覆盖接受时间（测试回放用）
 */
export function acceptRemoteConsultation(
  consultId: string,
  expertDoctor: string,
  now?: string,
): Consult {
  const cid = toText(consultId);
  const expert = toText(expertDoctor);
  if (!cid) throw new Error('会诊单 consultId 不能为空');
  if (!expert) throw new Error('接受专家 expertDoctor 不能为空');

  const consult = consults.find((c) => c.id === cid);
  if (!consult) throw new Error(`会诊单 consultId=${cid} 不存在`);
  if (consult.status === 'reported') {
    throw new Error(`会诊单 ${cid} 已提交报告，不能再接受`);
  }
  if (!consult.experts.includes(expert)) {
    throw new Error(`专家「${expert}」不在会诊单 ${cid} 的受邀名单内（${consult.experts.join('、')}）`);
  }
  if (consult.acceptedExperts.includes(expert)) {
    throw new Error(`专家「${expert}」已接受过会诊单 ${cid}，请勿重复接受`);
  }

  consult.acceptedExperts.push(expert);
  consult.acceptedAt = nowDate(now).toISOString();
  consult.acceptedBy = expert;

  // MDT：全部受邀专家接受后整体进入 accepted；单专家会诊接受即 accepted
  const allAccepted =
    consult.consultType !== 'mdt' ||
    consult.experts.every((e) => consult.acceptedExperts.includes(e));
  if (allAccepted) {
    consult.status = 'accepted';
  }

  return cloneConsult(consult);
}

/**
 * 【互联网医院与远程医疗】受邀专家提交会诊报告。
 *
 * 校验会诊单存在且处于 accepted（必须先有专家接受才能出报告）→ 写入报告正文，
 * 状态进入 reported。报告由接受会诊的专家本人提交并留痕，AI 不自动出报告。
 *
 * @param consultId 会诊单 id
 * @param report    会诊报告正文
 * @param now       可选，覆盖报告提交时间（测试回放用）
 */
export function submitRemoteReport(
  consultId: string,
  report: string,
  now?: string,
): Consult {
  const cid = toText(consultId);
  const text = toText(report);
  if (!cid) throw new Error('会诊单 consultId 不能为空');
  if (!text) throw new Error('会诊报告 report 不能为空');

  const consult = consults.find((c) => c.id === cid);
  if (!consult) throw new Error(`会诊单 consultId=${cid} 不存在`);
  if (consult.status === 'reported') {
    throw new Error(`会诊单 ${cid} 已提交报告，请勿重复提交`);
  }
  if (consult.status !== 'accepted') {
    throw new Error(`会诊单 ${cid} 尚未被专家接受，不能提交报告（当前状态：${consult.status}）`);
  }

  consult.report = text;
  consult.reportedAt = nowDate(now).toISOString();
  consult.status = 'reported';

  return cloneConsult(consult);
}

/**
 * 【互联网医院与远程医疗】列出全部会诊单（按申请时间倒序）。
 *
 * 副作用（纯计算口径内的在读索引刷新）：扫描所有仍处于 requested 的急会诊单，
 * 若当前时刻已超过 acceptDeadlineAt（申请 + 2h）仍未被接受，则置 escalated=true
 * 并生成升级提醒文案——「急会诊 2 小时内响应」的自动升级催办。
 *
 * @param now 可选，覆盖当前时间（测试回放用）
 */
export function listRemoteConsults(now?: string): Consult[] {
  const t = nowDate(now).getTime();
  for (const c of consults) {
    if (c.urgent && c.status === 'requested' && !c.escalated) {
      if (t > new Date(c.acceptDeadlineAt).getTime()) {
        c.escalated = true;
        c.escalationMessage =
          `【急会诊升级】${c.reqDept} ${c.reqDoctor} 发起的${c.consultTypeLabel}` +
          `（患者 ${c.patientId}）已超 2 小时无专家接受，请会诊调度台立即加急催办！`;
      }
    }
  }
  return consults
    .slice()
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .map(cloneConsult);
}

/** 深拷贝一张会诊单（返回副本，外部修改不污染台账） */
function cloneConsult(c: Consult): Consult {
  return {
    ...c,
    experts: c.experts.slice(),
    acceptedExperts: c.acceptedExperts.slice(),
  };
}

/** 测试专用：清空进程内台账，保证用例之间互不污染。 */
export function resetRemoteConsultLedger(): void {
  consults.length = 0;
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断               */
/* ------------------------------------------------------------------ */

/**
 * 把一张会诊单落库到 clinical.remote_consultation。
 * 由路由层在状态流转后显式 await；断库 / 表未迁移时静默降级，
 * 进程内台账仍可出时效升级，持久化留待重连后补写。
 */
export async function persistConsult(consult: Consult): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.remote_consultation
        (id, consult_type, req_dept, req_doctor, patient_id, reason,
         expert_hospital, experts, accepted_experts, urgent, status,
         requested_at, accept_deadline_at, accepted_at, accepted_by,
         report, reported_at, escalated)
      VALUES
        (${consult.id}, ${consult.consultType}, ${consult.reqDept}, ${consult.reqDoctor},
         ${consult.patientId}, ${consult.reason}, ${consult.expertHospital},
         ${JSON.stringify(consult.experts)}::jsonb,
         ${JSON.stringify(consult.acceptedExperts)}::jsonb,
         ${consult.urgent}, ${consult.status},
         ${consult.requestedAt}, ${consult.acceptDeadlineAt},
         ${consult.acceptedAt ?? null}, ${consult.acceptedBy ?? null},
         ${consult.report ?? null}, ${consult.reportedAt ?? null},
         ${consult.escalated})
      ON CONFLICT (id) DO UPDATE
        SET accepted_experts = EXCLUDED.accepted_experts,
            status = EXCLUDED.status,
            accepted_at = EXCLUDED.accepted_at,
            accepted_by = EXCLUDED.accepted_by,
            report = EXCLUDED.report,
            reported_at = EXCLUDED.reported_at,
            escalated = EXCLUDED.escalated,
            updated_at = now()
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可流转与升级，落库留待重连后补写
  }
}
