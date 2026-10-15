/**
 * 健澜科技 jlmedaios - 患者健康提醒聚合器（M122-C）
 *
 * 依据《中华人民共和国宪法》第四十五条：国家发展为公民享受休息和
 * 健康权利所需要的社会保险、社会救济和医疗卫生事业。本模块据此
 * 面向患者本人提供用药、就诊、检查准备与慢病随访的主动健康提醒，
 * 辅助患者自我管理，不替代医师诊疗判断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { listAppts } from '../../db/repositories/apptRepo.js';
import { listPlans } from '../../db/repositories/chronicRepo.js';
import { listEPrescriptionsByPatient } from '../../db/repositories/internetPrescriptionRepo.js';

/* ------------------------------------------------------------------ */
/* 输入 / 输出类型                                                      */
/* ------------------------------------------------------------------ */

/** 患者当前在用的一种药品（由处方等外部数据映射而来） */
export interface PatientMedication {
  id: string;
  /** 药品名称，如「氨氯地平片」 */
  name: string;
  /** 单次剂量文本，如「5mg」 */
  dosage?: string | null;
  /** 频次文本，如「每日一次 / bid」 */
  frequency?: string | null;
  /** 用药周期起（ISO date），可空 */
  startDate?: string | null;
  /** 用药周期止（ISO date），可空 */
  endDate?: string | null;
  /** 下一次计划服药时间（ISO datetime） */
  nextDoseAt: string;
  /** 用法备注 */
  instructions?: string | null;
}

/** 患者预约 */
export interface PatientAppointment {
  id: string;
  /** 预约开始时间（ISO datetime） */
  scheduledAt: string;
  department: string;
  purpose: string;
  /** scheduled / confirmed / completed / cancelled ... */
  status: string;
}

/** 患者在管慢病 */
export interface PatientChronicDisease {
  /** hypertension / diabetes / 其他病种代码 */
  disease: string;
  /** 下次随访日期（ISO date） */
  nextFollowupAt: string;
  /** 最近一次自测/测量时间（ISO datetime），可空 */
  lastVitalsAt?: string | null;
}

/** 单条健康提醒 */
export interface HealthReminder {
  /** 稳定 ID，便于前端去重/已读 */
  id: string;
  /** normal 常规 / warning 临近或逾期 / urgent 两小时内 */
  level: 'normal' | 'warning' | 'urgent';
  title: string;
  body: string;
  /** 提醒触发时间（ISO datetime） */
  dueAt: string;
  /** 关联业务对象 ID（处方/预约/慢病计划） */
  relatedId?: string;
}

/** 四类提醒聚合结果 */
export interface PatientHealthRemindersResult {
  medicationReminders: HealthReminder[];
  appointmentReminders: HealthReminder[];
  prepReminders: HealthReminder[];
  chronicCareReminders: HealthReminder[];
}

/* ------------------------------------------------------------------ */
/* 常量与小工具                                                        */
/* ------------------------------------------------------------------ */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function toDate(v: string | Date): Date {
  return v instanceof Date ? v : new Date(v);
}

/** HH:mm */
function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** M月d日 HH:mm */
function fmtDateTime(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日 ${fmtTime(d)}`;
}

/** 仅取日期部分做「天」粒度比较 */
function dayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function diseaseLabel(disease: string): string {
  if (disease === 'hypertension') return '高血压';
  if (disease === 'diabetes') return '糖尿病';
  return disease;
}

/* ------------------------------------------------------------------ */
/* 纯函数：健康提醒生成（M122-C 核心规则，单测覆盖）                    */
/* ------------------------------------------------------------------ */

/**
 * 依据《中华人民共和国宪法》第四十五条发展医疗卫生事业、保护人民
 * 健康的要求，把用药、预约、检查、慢病四类数据合成为患者今日可见的
 * 健康提醒。函数不读外部状态、不打网络，now 由调用方注入，便于测试。
 *
 * @param patientId 患者 ID（仅回显，不参与规则分支）
 * @param medications 在用药品列表
 * @param appointments 预约列表
 * @param chronicDiseases 在管慢病列表
 * @param now 当前时间，Date 或 ISO 字符串
 */
export function buildPatientHealthReminders(
  patientId: string,
  medications: PatientMedication[] = [],
  appointments: PatientAppointment[] = [],
  chronicDiseases: PatientChronicDisease[] = [],
  now: Date | string = new Date(),
): PatientHealthRemindersResult {
  const nowD = toDate(now);
  const nowTs = nowD.getTime();

  /* ---------- 1. 用药提醒：今日 24h 内的服药点 ---------- */
  // 依据宪法第四十五条：提醒患者按时规律服药，是健康自我管理的基础。
  const medicationReminders: HealthReminder[] = [];
  for (const med of medications ?? []) {
    // 用药周期已过则不再提醒
    if (med.endDate) {
      const endTs = dayStart(toDate(med.endDate));
      if (endTs < dayStart(nowD)) continue;
    }
    const doseAt = toDate(med.nextDoseAt);
    const delta = doseAt.getTime() - nowTs;
    const doseText = `${med.name}${med.dosage ? ` ${med.dosage}` : ''}`;

    if (delta < 0 && delta > -12 * HOUR) {
      // 已过服药时间但未超过半天：提醒补服
      const overdueH = Math.round(-delta / HOUR);
      medicationReminders.push({
        id: `med-${med.id}`,
        level: 'warning',
        title: '该服药了',
        body: `${doseText} 已过服药时间约 ${overdueH} 小时，请尽快服用（${med.frequency ?? '遵医嘱'}）`,
        dueAt: doseAt.toISOString(),
        relatedId: med.id,
      });
    } else if (delta >= 0 && delta <= 2 * HOUR) {
      medicationReminders.push({
        id: `med-${med.id}`,
        level: 'urgent',
        title: '即将服药',
        body: `${fmtTime(doseAt)} 请服用 ${doseText}（${med.frequency ?? '遵医嘱'}）`,
        dueAt: doseAt.toISOString(),
        relatedId: med.id,
      });
    } else if (delta > 2 * HOUR && delta <= 24 * HOUR) {
      medicationReminders.push({
        id: `med-${med.id}`,
        level: 'normal',
        title: '今日用药提醒',
        body: `${fmtTime(doseAt)} 记得服用 ${doseText}`,
        dueAt: doseAt.toISOString(),
        relatedId: med.id,
      });
    }
  }
  medicationReminders.sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  /* ---------- 2. 就诊提醒：未来 7 天内的有效预约 ---------- */
  // 依据宪法第四十五条：帮助患者按时就诊，减少失约与就诊延误。
  const appointmentReminders: HealthReminder[] = [];
  const activeStatus = new Set(['scheduled', 'confirmed']);
  for (const appt of appointments ?? []) {
    if (!activeStatus.has(appt.status)) continue;
    const at = toDate(appt.scheduledAt);
    const delta = at.getTime() - nowTs;
    if (delta < 0 || delta > 7 * DAY) continue;
    let level: HealthReminder['level'] = 'normal';
    let title = '近期预约';
    if (delta <= 2 * HOUR) { level = 'urgent'; title = '预约即将开始'; }
    else if (delta <= 24 * HOUR) { level = 'warning'; title = '明天有预约'; }
    appointmentReminders.push({
      id: `appt-${appt.id}`,
      level,
      title,
      body: `${appt.department} · ${appt.purpose}，${fmtDateTime(at)}`,
      dueAt: at.toISOString(),
      relatedId: appt.id,
    });
  }
  appointmentReminders.sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  /* ---------- 3. 检查准备提醒：需空腹的检查类预约 ---------- */
  // 依据宪法第四十五条：检查前准备到位才能保证检验检查结果准确。
  const FASTING_RE = /(空腹|抽血|化验|内镜|胃肠镜|胃肠|B超|超声检查)/;
  const prepReminders: HealthReminder[] = [];
  for (const appt of appointments ?? []) {
    if (!activeStatus.has(appt.status)) continue;
    if (!FASTING_RE.test(`${appt.department} ${appt.purpose}`)) continue;
    const at = toDate(appt.scheduledAt);
    const delta = at.getTime() - nowTs;
    if (delta < 0 || delta > 48 * HOUR) continue;
    // 提醒在检查前一晚 22:00 触发；若现在已在 24h 内则立即提醒
    const prepDue = new Date(at);
    prepDue.setDate(prepDue.getDate() - 1);
    prepDue.setHours(22, 0, 0, 0);
    const dueTs = prepDue.getTime() < nowTs ? at.getTime() - 2 * HOUR : prepDue.getTime();
    prepReminders.push({
      id: `prep-${appt.id}`,
      level: delta <= 24 * HOUR ? 'warning' : 'normal',
      title: '检查前准备提醒',
      body: `您预约的「${appt.department} ${appt.purpose}」需空腹：检查前 8 小时起禁食禁水，前一晚 22:00 后请勿进食`,
      dueAt: new Date(dueTs).toISOString(),
      relatedId: appt.id,
    });
  }
  prepReminders.sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  /* ---------- 4. 慢病照护提醒：随访临近/逾期 + 每日自测 ---------- */
  // 依据宪法第四十五条：对高血压、糖尿病等慢性病患者主动随访与健康指导。
  const chronicCareReminders: HealthReminder[] = [];
  for (const dis of chronicDiseases ?? []) {
    const label = diseaseLabel(dis.disease);
    const followup = toDate(dis.nextFollowupAt);
    const followupDay = dayStart(followup);
    const today = dayStart(nowD);
    const diffDays = Math.round((followupDay - today) / DAY);

    if (diffDays < 0) {
      chronicCareReminders.push({
        id: `chronic-fu-${dis.disease}`,
        level: 'warning',
        title: '慢病随访已逾期',
        body: `${label}随访已逾期 ${-diffDays} 天，请尽快预约复诊`,
        dueAt: followup.toISOString(),
        relatedId: dis.disease,
      });
    } else if (diffDays <= 7) {
      chronicCareReminders.push({
        id: `chronic-fu-${dis.disease}`,
        level: 'normal',
        title: '慢病随访临近',
        body: `${label}下次随访 ${followup.getMonth() + 1}月${followup.getDate()}日（${diffDays} 天后），请按时就诊`,
        dueAt: followup.toISOString(),
        relatedId: dis.disease,
      });
    }

    // 每日自测提醒：距上次测量超过 20 小时（或从未测量）即提醒
    const lastTs = dis.lastVitalsAt ? toDate(dis.lastVitalsAt).getTime() : 0;
    if (nowTs - lastTs >= 20 * HOUR) {
      const tip = dis.disease === 'diabetes'
        ? '请今日测量空腹及餐后血糖并记录'
        : dis.disease === 'hypertension'
          ? '请今日测量血压并记录'
          : `请今日完成${label}自我监测并记录`;
      chronicCareReminders.push({
        id: `chronic-m-${dis.disease}`,
        level: 'normal',
        title: '今日自测提醒',
        body: tip,
        dueAt: nowD.toISOString(),
        relatedId: dis.disease,
      });
    }
  }

  return {
    medicationReminders,
    appointmentReminders,
    prepReminders,
    chronicCareReminders,
  };
}

/* ------------------------------------------------------------------ */
/* 视图装配：从患者侧数据映射后调用纯函数                                */
/* ------------------------------------------------------------------ */

export class PatientHealthRemindersError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'PatientHealthRemindersError';
  }
}
const forbidden = (m: string) => new PatientHealthRemindersError(403, 'FORBIDDEN', m);

/** 频次文本 → 今日第一次服药小时 */
function firstDoseHour(frequency?: string | null): number {
  const f = (frequency ?? '').toLowerCase();
  if (f.includes('qd') || f.includes('每日一次') || f.includes('一日一次')) return 8;
  if (f.includes('bid') || f.includes('每日两次') || f.includes('一日两次')) return 8;
  if (f.includes('tid') || f.includes('每日三次') || f.includes('一日三次')) return 8;
  if (f.includes('qn') || f.includes('睡前')) return 21;
  return 8;
}

/** 患者本人视角：聚合本人的用药/预约/慢病数据，生成健康提醒 */
export async function myHealthRemindersView(
  auth: AuthView,
): Promise<PatientHealthRemindersResult> {
  if (!auth.rawRoles.includes('patient')) throw forbidden('仅患者本人可访问');
  if (!auth.permissions.includes('patient_portal:view')) throw forbidden('缺少权限：patient_portal:view');

  const patientId = auth.id;
  const [appts, plans, rxs] = await Promise.all([
    listAppts(),
    listPlans(patientId),
    listEPrescriptionsByPatient(patientId),
  ]);

  // 用药：仅在审方通过/已付费的处方内，且在给药天数窗口内
  const medications: PatientMedication[] = [];
  for (const rx of rxs) {
    if (rx.patientId !== patientId) continue;
    if (rx.status !== 'approved' && rx.status !== 'paid') continue;
    const startedAt = new Date(rx.createdAt);
    for (const it of rx.items) {
      const endDate = it.daysSupply != null
        ? new Date(startedAt.getTime() + it.daysSupply * DAY).toISOString().slice(0, 10)
        : null;
      // 今日首次服药时间
      const dose = new Date();
      dose.setHours(firstDoseHour(it.frequency ?? null), 0, 0, 0);
      medications.push({
        id: it.id ?? `${rx.id}-${it.drugName ?? 'item'}`,
        name: it.drugName ?? '药品',
        dosage: it.dosage != null ? `${it.dosage}${it.dosageUnit ?? ''}` : null,
        frequency: it.frequency ?? null,
        startDate: rx.createdAt.slice(0, 10),
        endDate,
        nextDoseAt: dose.toISOString(),
        instructions: it.remark ?? null,
      });
    }
  }

  // 预约：仅本人
  const appointments: PatientAppointment[] = appts
    .filter((a) => a.patientId === patientId)
    .map((a) => ({
      id: a.id,
      scheduledAt: a.scheduledAt,
      department: a.department,
      purpose: a.purpose,
      status: a.status,
    }));

  // 慢病计划
  const chronicDiseases: PatientChronicDisease[] = plans.map((p) => ({
    disease: p.disease,
    nextFollowupAt: p.nextFollowupAt,
    lastVitalsAt: null,
  }));

  return buildPatientHealthReminders(patientId, medications, appointments, chronicDiseases, new Date());
}
