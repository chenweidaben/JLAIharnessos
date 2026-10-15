/**
 * 健澜科技 jlmedaios - 患者端 H5 首页聚合器（M148-C，产品化收尾）
 *
 * 面向患者本人的 H5 首页一站式聚合：我的预约 / 我的报告 / 我的账单 /
 * 健康提醒（用药 / 复诊 / 接种）/ 智能导诊。依据《中华人民共和国宪法》
 * 第四十五条发展医疗卫生事业、保护人民健康的要求，以大字大按钮、易懂
 * 文案的方式帮助患者自我管理，不替代医师诊疗判断。
 *
 * 移动端 + 性能优化：纯函数、无 IO、无网络、无 WebSocket 依赖；
 * now 由调用方注入，便于单测与缓存；输出对象一次性构建，避免重复遍历。
 *
 * 生产安全加固（产品化收尾）：
 *  - 对外输出前对姓名 / 手机号强制脱敏；身份证号一律不下发（直接丢弃）；
 *  - 不修改入参，所有输出均为拷贝，避免污染上游缓存与审计快照。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { maskName, maskPhone } from './dataMaskingAggregator.js';

/* ------------------------------------------------------------------ */
/* 输入 / 输出类型                                                      */
/* ------------------------------------------------------------------ */

/** 健康提醒业务类型：用药 / 复诊 / 接种 */
export type H5ReminderKind = 'medication' | 'followup' | 'vaccination';

/** 提醒紧迫度：urgent 两小时内 / warning 临近或逾期 / normal 常规 */
export type H5ReminderLevel = 'urgent' | 'warning' | 'normal';

/** 单条健康提醒 */
export interface H5Reminder {
  id: string;
  kind: H5ReminderKind;
  level: H5ReminderLevel;
  title: string;
  body: string;
  /** 提醒触发时间（ISO datetime） */
  dueAt: string;
}

/** 我的预约条目 */
export interface H5Appointment {
  id: string;
  /** 预约时间（ISO datetime） */
  scheduledAt: string;
  department: string;
  doctor: string;
  purpose: string;
  /** scheduled / confirmed / completed / cancelled */
  status: string;
}

/** 我的报告条目 */
export interface H5Report {
  id: string;
  name: string;
  /** 报告日期（ISO date / datetime） */
  reportDate: string;
  /** available 已出 / pending 出报告中 */
  status: 'available' | 'pending';
  summary?: string | null;
}

/** 我的账单条目 */
export interface H5Bill {
  id: string;
  title: string;
  /** 费用金额（元），可空 */
  amount?: number | null;
  /** unpaid 待缴 / paid 已缴 / refunded 已退 */
  status: 'unpaid' | 'paid' | 'refunded';
  /** 账单日期（ISO date / datetime） */
  billDate: string;
}

/** 患者本人档案（原始输入，含 PII，由路由装配） */
export interface H5PatientProfile {
  name: string;
  /** 手机号（原始，将被脱敏） */
  phone?: string | null;
  /** 身份证号（原始，将被丢弃，绝不下发） */
  idCard?: string | null;
}

/** 智能导诊入口配置 */
export interface H5GuideEntry {
  available?: boolean;
  quickSymptoms?: string[];
}

/** buildPatientH5Dashboard 的原始输入（由路由装配） */
export interface PatientH5DashboardInput {
  profile?: H5PatientProfile;
  appointments?: H5Appointment[];
  reports?: H5Report[];
  bills?: H5Bill[];
  reminders?: H5Reminder[];
  guide?: H5GuideEntry;
}

/** 脱敏后回显给前端的患者档案（不含身份证号） */
export interface H5MaskedProfile {
  name: string;
  phone: string;
}

/** 患者端 H5 首页聚合结果 */
export interface PatientH5Dashboard {
  patientId: string;
  /** 时段问候语，如「早上好」 */
  greeting: string;
  /** 脱敏后的患者档案（无身份证号） */
  profile: H5MaskedProfile;
  /** 我的预约（未完成、按时间升序，限量） */
  appointments: H5Appointment[];
  /** 待就诊预约条数 */
  appointmentCount: number;
  /** 我的报告（按日期倒序，限量） */
  reports: H5Report[];
  /** 我的账单（待缴优先、按日期倒序，限量） */
  bills: H5Bill[];
  /** 待缴账单总额（元） */
  unpaidAmount: number;
  /** 待缴账单条数 */
  unpaidCount: number;
  /** 健康提醒（按紧迫度 + 时间排序，限量） */
  healthReminders: H5Reminder[];
  /** 紧急提醒条数 */
  urgentCount: number;
  /** 智能导诊入口 */
  smartGuide: { available: boolean; quickSymptoms: string[] };
  /** 聚合时间（ISO datetime） */
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 常量与小工具（产品化收尾）                                          */
/* ------------------------------------------------------------------ */

/** 移动端：预约 / 报告 / 账单 / 提醒最多展示条数，避免长列表拖慢滑动 */
const MAX_APPOINTMENTS = 5;
const MAX_REPORTS = 5;
const MAX_BILLS = 5;
const MAX_REMINDERS = 10;

/** 紧迫度排序权重：数值越小越靠前 */
const LEVEL_RANK: Record<H5ReminderLevel, number> = {
  urgent: 0,
  warning: 1,
  normal: 2,
};

/** 账单状态排序权重：待缴在前 */
const BILL_STATUS_RANK: Record<H5Bill['status'], number> = {
  unpaid: 0,
  paid: 1,
  refunded: 2,
};

function toDate(v: Date | string | null | undefined): Date {
  if (v instanceof Date) return v;
  if (v) return new Date(v);
  return new Date();
}

/** 按时段生成问候语 */
function greetingOf(now: Date): string {
  const h = now.getHours();
  if (h < 5) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/** 已完成 / 已取消的预约不再展示在「我的预约」待办列表 */
function isOpenAppointment(a: H5Appointment): boolean {
  return a.status !== 'completed' && a.status !== 'cancelled';
}

/* ------------------------------------------------------------------ */
/* 纯函数：权限校验（产品化收尾，路由复用、单测覆盖）                   */
/* ------------------------------------------------------------------ */

/**
 * 判定给定原始角色码列表是否包含患者本人角色。
 * 产品化收尾：H5 首页仅患者本人可访问，非患者角色（doctor/nurse/admin 等）一律拒绝。
 *
 * @param rawRoles 原始 iam 角色码列表（来自 AuthView.rawRoles）
 * @returns 是否为患者本人
 */
export function isPatientRole(rawRoles: readonly string[] | null | undefined): boolean {
  if (!Array.isArray(rawRoles)) return false;
  return rawRoles.includes('patient');
}

/* ------------------------------------------------------------------ */
/* 纯函数：患者端 H5 首页聚合（M148-C 核心规则，单测覆盖）              */
/* ------------------------------------------------------------------ */

/**
 * 患者端 H5 首页聚合纯函数。
 *
 * 移动端 + 性能优化：
 * 1. 不读外部状态、不发网络请求、不触碰 WebSocket；
 * 2. 输入数组先拷贝再排序，避免污染调用方原始数据；
 * 3. 各列表分别限量，账单「待缴优先」，提醒「紧迫度优先」；
 * 4. now 注入，便于缓存与单测。
 *
 * 生产安全加固：
 *  - 姓名经 maskName 脱敏、手机号经 maskPhone 脱敏；
 *  - 身份证号无论是否传入都不会出现在输出中（直接丢弃）。
 *
 * @param patientId 患者 ID（仅回显，不参与规则分支）
 * @param input     原始输入：档案 / 预约 / 报告 / 账单 / 提醒 / 导诊
 * @param now       当前时间，Date 或 ISO 字符串（便于测试）
 */
export function buildPatientH5Dashboard(
  patientId: string,
  input: PatientH5DashboardInput = {},
  now: Date | string = new Date(),
): PatientH5Dashboard {
  const nowD = toDate(now);

  /* ---------- 0. 患者档案：强制脱敏，丢弃身份证号 ---------- */
  const p = (input.profile ?? {}) as H5PatientProfile;
  const profile: H5MaskedProfile = {
    name: maskName(p.name),
    phone: maskPhone(p.phone),
  };
  // 产品化收尾：idCard 字段在输入中即使存在，也不进入输出对象。

  /* ---------- 1. 我的预约：未完成优先，按预约时间升序 ---------- */
  const rawAppts = Array.isArray(input.appointments) ? input.appointments : [];
  const appointments = rawAppts
    .filter(isOpenAppointment)
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, MAX_APPOINTMENTS);

  /* ---------- 2. 我的报告：按报告日期倒序，限量 ---------- */
  const rawReports = Array.isArray(input.reports) ? input.reports : [];
  const reports = rawReports
    .slice()
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
    .slice(0, MAX_REPORTS);

  /* ---------- 3. 我的账单：待缴优先，再按账单日期倒序 ---------- */
  const rawBills = Array.isArray(input.bills) ? input.bills : [];
  const bills = rawBills
    .slice()
    .sort((a, b) => {
      const ra = BILL_STATUS_RANK[a.status] ?? BILL_STATUS_RANK.paid;
      const rb = BILL_STATUS_RANK[b.status] ?? BILL_STATUS_RANK.paid;
      if (ra !== rb) return ra - rb;
      return new Date(b.billDate).getTime() - new Date(a.billDate).getTime();
    })
    .slice(0, MAX_BILLS);

  /* 待缴账单汇总：金额保留两位小数，避免浮点漂移 */
  const unpaid = rawBills.filter((b) => b.status === 'unpaid');
  const unpaidAmount = Math.round(unpaid.reduce((sum, b) => sum + (b.amount ?? 0), 0) * 100) / 100;
  const unpaidCount = unpaid.length;

  /* ---------- 4. 健康提醒：紧迫度优先，同紧迫度按时间升序 ---------- */
  const rawReminders = Array.isArray(input.reminders) ? input.reminders : [];
  const healthReminders = rawReminders
    .slice()
    .sort((a, b) => {
      const la = LEVEL_RANK[a.level] ?? LEVEL_RANK.normal;
      const lb = LEVEL_RANK[b.level] ?? LEVEL_RANK.normal;
      if (la !== lb) return la - lb;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, MAX_REMINDERS);

  const urgentCount = healthReminders.filter((r) => r.level === 'urgent').length;

  /* ---------- 5. 智能导诊入口：缺省开放，给一组常见快捷症状 ---------- */
  const guide = input.guide ?? {};
  const quick = Array.isArray(guide.quickSymptoms) ? guide.quickSymptoms : [];
  const smartGuide = {
    available: guide.available ?? true,
    quickSymptoms:
      quick.length > 0 ? quick.slice(0, 6) : ['头疼', '发烧', '咳嗽', '肚子痛', '胸闷', '关节痛'],
  };

  return {
    patientId,
    greeting: greetingOf(nowD),
    profile,
    appointments,
    appointmentCount: appointments.length,
    reports,
    bills,
    unpaidAmount,
    unpaidCount,
    healthReminders,
    urgentCount,
    smartGuide,
    updatedAt: nowD.toISOString(),
  };
}
