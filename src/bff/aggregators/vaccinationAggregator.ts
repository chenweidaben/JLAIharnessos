/**
 * 健澜科技 jlmedaios - 预防接种聚合器（M142-B · 预防保健与患者服务）
 *
 * 【预防保健与患者服务】以患者为中心的预防接种闭环：
 *   - scheduleVaccine：按疫苗类别推导剂次间隔，排好全程接种计划（Plan）；
 *   - recordVaccineDose：登记一针接种（护士 + 批号签名），回写剂次进度，
 *     并按实际接种日期滚动重算下一针应种日期；
 *   - getNextDoseReminder：计算患者下一针提醒——提前 7 天进入提醒窗口，
 *     超期未种单独标记，「不能让患者忘了打」。
 *
 * 覆盖五类疫苗：儿童规划免疫 / 成人流感 / 新冠 / HPV / 乙肝。
 *
 * 与全仓聚合器约定一致（同 teachingAggregator）：
 *   - 三个对外函数均为纯计算（校验、组包、滚动重算），不修改入参；
 *   - 进程内台账 plans / doseRecords 是提醒与查询的在读索引；
 *     PostgreSQL 为持久化，落库为 best-effort（断库 / 表未迁移时降级，
 *     不阻断接种登记与提醒主流程）；
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

/** 疫苗类别（与 clinical.vaccination_record.category CHECK 一致） */
export type VaccineCategory = 'childhood' | 'flu' | 'covid' | 'hpv' | 'hepb';

/** 提前提醒天数（业务红线：下一针提前 7 天提醒） */
export const REMINDER_LEAD_DAYS = 7;

/** 类别元数据：代码 → 中文标签 + 剂次间隔（天） */
const CATEGORY_META: Readonly<
  Record<VaccineCategory, { label: string; defaultDoses: number; gaps: readonly number[] }>
> = {
  // 儿童规划免疫：多剂次，常规间隔约 4 周（28 天）
  childhood: { label: '儿童规划免疫', defaultDoses: 5, gaps: [28] },
  // 成人流感：每年 1 针（若排多剂次，按 365 天年度间隔滚动）
  flu: { label: '成人流感', defaultDoses: 1, gaps: [365] },
  // 新冠：基础免疫 2 剂间隔 21 天，加强针按 21 天滚动
  covid: { label: '新冠', defaultDoses: 2, gaps: [21] },
  // HPV：0-2-6 月程序，间隔 60 天 / 120 天
  hpv: { label: 'HPV', defaultDoses: 3, gaps: [60, 120] },
  // 乙肝：0-1-6 月程序，间隔 30 天 / 150 天
  hepb: { label: '乙肝', defaultDoses: 3, gaps: [30, 150] },
};

/** 五类疫苗的判别关键词（命中即归类；顺序优先匹配更具体的口径） */
const CATEGORY_KEYWORDS: ReadonlyArray<{ cat: VaccineCategory; words: readonly string[] }> = [
  { cat: 'hepb', words: ['乙肝', '乙型肝炎', '肝疫苗'] },
  { cat: 'hpv', words: ['hpv', '人乳头瘤', '宫颈癌疫苗'] },
  { cat: 'covid', words: ['新冠', 'covid', '冠状病毒', '灭活疫苗', '腺病毒'] },
  { cat: 'flu', words: ['流感'] },
  { cat: 'childhood', words: ['规划免疫', '一类苗', '儿童', '卡介苗', '脊灰', '百白破', '麻腮风', '乙脑', '流脑'] },
];

/** 单个剂次的排程与接种状态 */
export interface DoseSchedule {
  /** 剂次序号（从 1 开始） */
  doseNo: number;
  /** 应种日期 YYYY-MM-DD */
  dueDate: string;
  /** 接种状态：pending 待种 / done 已种 */
  status: 'pending' | 'done';
  /** 实际接种时间 ISO 串（status=done 时） */
  administeredAt?: string;
  /** 接种护士工号（status=done 时） */
  nurseId?: string;
  /** 疫苗批号（status=done 时） */
  batchNo?: string;
}

/** 一份接种计划（一人一苗，BFF 对外形态，camelCase） */
export interface Plan {
  /** 计划唯一标识 */
  id: string;
  /** 患者标识 */
  patientId: string;
  /** 疫苗名称 */
  vaccineName: string;
  /** 类别代码 */
  category: VaccineCategory;
  /** 类别中文标签（前端看板直接展示） */
  categoryLabel: string;
  /** 全程剂次数 */
  totalDoses: number;
  /** 剂次排程（含接种进度） */
  doses: DoseSchedule[];
  /** 首针应种日期 YYYY-MM-DD */
  startDate: string;
  /** 提前提醒天数（固定 7） */
  reminderLeadDays: number;
  /** 创建时间 ISO 串 */
  createdAt: string;
}

/** 一针接种记录（recordVaccineDose 的返回形态） */
export interface DoseRecord {
  /** 本次接种记录唯一标识 */
  id: string;
  /** 关联接种计划 id */
  recordId: string;
  /** 患者标识 */
  patientId: string;
  /** 疫苗名称 */
  vaccineName: string;
  /** 本次接种的剂次序号 */
  doseNo: number;
  /** 接种护士工号 */
  nurseId: string;
  /** 疫苗批号 */
  batchNo: string;
  /** 实际接种时间 ISO 串 */
  administeredAt: string;
}

/** 下一针提醒（getNextDoseReminder 的返回形态） */
export interface Reminder {
  patientId: string;
  /** 是否还有待种剂次；false 表示全程已完成 */
  hasNext: boolean;
  /** 关联计划 id（无待种时为 null） */
  recordId: string | null;
  vaccineName: string | null;
  categoryLabel: string | null;
  /** 下一针剂次序号 */
  nextDoseNo: number | null;
  /** 下一针应种日期 YYYY-MM-DD */
  dueDate: string | null;
  /** 提醒开始日期（应种日前 7 天） */
  remindDate: string | null;
  /** 距应种天数（正=未来，负=已超期） */
  daysUntilDue: number | null;
  /** 是否已进入 7 天提醒窗口 */
  inWindow: boolean;
  /** 是否已超期未种 */
  overdue: boolean;
  /** 面向患者/护士的提醒文案 */
  message: string;
}

/* ------------------------------------------------------------------ */
/* 进程内接种台账（提醒与查询的在读索引）                               */
/* ------------------------------------------------------------------ */

const plans: Plan[] = [];
const doseRecords: DoseRecord[] = [];

/** 宽松收敛为 trim 后字符串 */
function toText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/** 把 Date 收敛为本地 YYYY-MM-DD（避免 UTC 偏移导致跨天） */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

/** 今天 YYYY-MM-DD（可被 now 覆盖，便于测试回放） */
function today(now?: string): string {
  if (now) return now.slice(0, 10);
  return toISODate(new Date());
}

/** 在 YYYY-MM-DD 上加减 n 天，返回新的 YYYY-MM-DD */
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** 两个 YYYY-MM-DD 相差天数（later - earlier） */
function diffDays(later: string, earlier: string): number {
  const ms = new Date(`${later}T00:00:00`).getTime() - new Date(`${earlier}T00:00:00`).getTime();
  return Math.round(ms / 86400000);
}

/** 校验 YYYY-MM-DD 日期串 */
function assertDate(dateStr: string, label: string): void {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(dateStr)) {
    throw new Error(`${label}=${dateStr} 非法（应为 YYYY-MM-DD）`);
  }
}

/**
 * 【预防保健与患者服务】按疫苗名关键词推断疫苗类别。
 * 判别顺序：乙肝 → HPV → 新冠 → 流感 → 儿童规划免疫（兜底）。
 */
function inferCategory(vaccineName: string): VaccineCategory {
  const text = vaccineName.toLowerCase();
  for (const { cat, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => text.includes(w.toLowerCase()))) return cat;
  }
  return 'childhood';
}

/**
 * 第 doseNo 针（>=2）相对上一针的间隔天数。
 * 间隔表按剂次推进；超出表长时重复最后一个间隔（多剂次加强程序）。
 */
function gapBeforeDose(category: VaccineCategory, doseNo: number): number {
  const gaps = CATEGORY_META[category].gaps;
  const idx = Math.min(doseNo - 2, gaps.length - 1);
  return gaps[Math.max(0, idx)];
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【预防保健与患者服务】排程一份接种计划。
 *
 * 组包 → 校验 → 按类别推导全程剂次与间隔 → 写入进程内台账 → 返回计划副本。
 * 首针应种日期取当天（now 可覆盖）；后续剂次按类别间隔依次排定。
 *
 * @param patientId   患者标识
 * @param vaccineName 疫苗名称（如 乙肝疫苗 / HPV九价 / 新冠灭活）
 * @param doses        全程剂次数；<=0 或缺省时取类别默认剂次
 * @param now          可选，覆盖当前日期（测试回放用，YYYY-MM-DD 或 ISO）
 */
export function scheduleVaccine(
  patientId: string,
  vaccineName: string,
  doses: number,
  now?: string,
): Plan {
  const pid = toText(patientId);
  const name = toText(vaccineName);
  if (!pid) throw new Error('患者 patientId 不能为空');
  if (!name) throw new Error('疫苗名称 vaccineName 不能为空');

  const category = inferCategory(name);
  const meta = CATEGORY_META[category];

  let total = Number(doses);
  if (!Number.isFinite(total) || total <= 0) total = meta.defaultDoses;
  total = Math.floor(total);

  const start = today(now);
  assertDate(start, 'startDate');

  const doseList: DoseSchedule[] = [];
  let cursor = start;
  for (let i = 1; i <= total; i += 1) {
    if (i > 1) cursor = addDays(cursor, gapBeforeDose(category, i));
    doseList.push({ doseNo: i, dueDate: cursor, status: 'pending' });
  }

  const plan: Plan = {
    id: randomUUID(),
    patientId: pid,
    vaccineName: name,
    category,
    categoryLabel: meta.label,
    totalDoses: total,
    doses: doseList,
    startDate: start,
    reminderLeadDays: REMINDER_LEAD_DAYS,
    createdAt: now ? new Date(`${start}T00:00:00`).toISOString() : new Date().toISOString(),
  };
  plans.push(plan);
  return { ...plan, doses: plan.doses.map((d) => ({ ...d })) };
}

/**
 * 【预防保健与患者服务】登记一针接种。
 *
 * 校验计划存在 → 校验剂次号合法且未重复接种 → 回写剂次状态/护士/批号 →
 * 若不是最后一针，按实际接种日期滚动重算下一针应种日期 → 返回本次接种记录。
 *
 * @param recordId 接种计划 id（scheduleVaccine 返回的 id）
 * @param nurseId  接种护士工号（本人签名）
 * @param batchNo  疫苗批号
 * @param dose     本次接种的剂次序号；<=0 时自动取第一个待种剂次
 * @param now      可选，覆盖接种时间（测试回放用）
 */
export function recordVaccineDose(
  recordId: string,
  nurseId: string,
  batchNo: string,
  dose: number,
  now?: string,
): DoseRecord {
  const rid = toText(recordId);
  const nurse = toText(nurseId);
  const batch = toText(batchNo);
  if (!rid) throw new Error('接种计划 recordId 不能为空');
  if (!nurse) throw new Error('接种护士 nurseId 不能为空');
  if (!batch) throw new Error('疫苗批号 batchNo 不能为空');

  const plan = plans.find((p) => p.id === rid);
  if (!plan) throw new Error(`接种计划 recordId=${rid} 不存在，无法登记接种`);

  // 自动定位下一个待种剂次
  let doseNo = Number(dose);
  if (!Number.isFinite(doseNo) || doseNo <= 0) {
    const next = plan.doses.find((d) => d.status === 'pending');
    if (!next) throw new Error(`计划 ${plan.vaccineName} 全程 ${plan.totalDoses} 剂次已全部完成`);
    doseNo = next.doseNo;
  }
  doseNo = Math.floor(doseNo);

  if (doseNo < 1 || doseNo > plan.totalDoses) {
    throw new Error(`剂次 dose=${doseNo} 越界（全程共 ${plan.totalDoses} 剂次）`);
  }
  const target = plan.doses.find((d) => d.doseNo === doseNo);
  if (!target) throw new Error(`剂次 dose=${doseNo} 不存在`);
  if (target.status === 'done') {
    throw new Error(`第 ${doseNo} 剂次已接种（批号 ${target.batchNo}），禁止重复接种`);
  }

  const administeredAt = now ? new Date(now).toISOString() : new Date().toISOString();
  const administeredDate = administeredAt.slice(0, 10);

  target.status = 'done';
  target.administeredAt = administeredAt;
  target.nurseId = nurse;
  target.batchNo = batch;

  // 按实际接种日期滚动重算下一针应种日期
  if (doseNo < plan.totalDoses) {
    const next = plan.doses.find((d) => d.doseNo === doseNo + 1);
    if (next) next.dueDate = addDays(administeredDate, gapBeforeDose(plan.category, doseNo + 1));
  }

  const record: DoseRecord = {
    id: randomUUID(),
    recordId: plan.id,
    patientId: plan.patientId,
    vaccineName: plan.vaccineName,
    doseNo,
    nurseId: nurse,
    batchNo: batch,
    administeredAt,
  };
  doseRecords.push(record);
  return { ...record };
}

/**
 * 【预防保健与患者服务】计算患者下一针提醒。
 *
 * 在患者全部接种计划中，取「应种日期最早的待种剂次」作为下一针：
 *   - remindDate = 应种日前 7 天（提前提醒，不让患者忘了打）；
 *   - inWindow：今天已进入 7 天提醒窗口（0 <= 距种天数 <= 7）；
 *   - overdue：已超期未种（距种天数 < 0）。
 * 全程已完成时 hasNext=false，文案提示完成。
 *
 * @param patientId 患者标识
 * @param now       可选，覆盖当前日期（测试回放用）
 */
export function getNextDoseReminder(patientId: string, now?: string): Reminder {
  const pid = toText(patientId);
  if (!pid) throw new Error('患者 patientId 不能为空');

  const todayStr = today(now);
  assertDate(todayStr, 'today');

  // 收集所有待种剂次，按应种日期升序取最近一针
  let best: { plan: Plan; dose: DoseSchedule } | null = null;
  for (const plan of plans) {
    if (plan.patientId !== pid) continue;
    for (const dose of plan.doses) {
      if (dose.status !== 'pending') continue;
      if (!best || dose.dueDate < best.dose.dueDate) {
        best = { plan, dose };
      }
    }
  }

  if (!best) {
    return {
      patientId: pid,
      hasNext: false,
      recordId: null,
      vaccineName: null,
      categoryLabel: null,
      nextDoseNo: null,
      dueDate: null,
      remindDate: null,
      daysUntilDue: null,
      inWindow: false,
      overdue: false,
      message: '该患者暂无待种剂次，全程接种计划已完成。',
    };
  }

  const { plan, dose } = best;
  const dueDate = dose.dueDate;
  const remindDate = addDays(dueDate, -REMINDER_LEAD_DAYS);
  const daysUntilDue = diffDays(dueDate, todayStr);
  const inWindow = daysUntilDue >= 0 && daysUntilDue <= REMINDER_LEAD_DAYS;
  const overdue = daysUntilDue < 0;

  let message: string;
  if (overdue) {
    message = `【超期提醒】${plan.vaccineName} 第 ${dose.doseNo} 针应种日期 ${dueDate}，已超期 ${Math.abs(daysUntilDue)} 天，请尽快联系患者补种。`;
  } else if (inWindow) {
    message = `【接种提醒】${plan.vaccineName} 第 ${dose.doseNo} 针将于 ${dueDate} 接种（还剩 ${daysUntilDue} 天），请提前告知患者按时到接种门诊。`;
  } else {
    message = `${plan.vaccineName} 第 ${dose.doseNo} 针应种日期 ${dueDate}，距接种还有 ${daysUntilDue} 天（${remindDate} 起进入提醒窗口）。`;
  }

  return {
    patientId: pid,
    hasNext: true,
    recordId: plan.id,
    vaccineName: plan.vaccineName,
    categoryLabel: plan.categoryLabel,
    nextDoseNo: dose.doseNo,
    dueDate,
    remindDate,
    daysUntilDue,
    inWindow,
    overdue,
    message,
  };
}

/** 列出某患者全部接种计划（按创建时间倒序，路由 GET 看板直接消费） */
export function listPlansByPatient(patientId: string): Plan[] {
  const pid = toText(patientId);
  return plans
    .filter((p) => p.patientId === pid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({ ...p, doses: p.doses.map((d) => ({ ...d })) }));
}

/** 测试专用：清空进程内台账，保证用例之间互不污染。 */
export function resetVaccinationLedger(): void {
  plans.length = 0;
  doseRecords.length = 0;
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断               */
/* ------------------------------------------------------------------ */

/**
 * 把接种计划落库到 clinical.vaccination_record。
 * 由路由层在 scheduleVaccine 之后显式 await；断库 / 表未迁移时静默降级，
 * 进程内台账仍可出提醒，持久化留待重连后补写。
 */
export async function persistPlan(plan: Plan): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.vaccination_record
        (id, patient_id, vaccine_name, category, total_doses, doses,
         start_date, reminder_lead_days)
      VALUES
        (${plan.id}, ${plan.patientId}, ${plan.vaccineName}, ${plan.category},
         ${plan.totalDoses}, ${JSON.stringify(plan.doses)}::jsonb,
         ${plan.startDate}::date, ${plan.reminderLeadDays})
      ON CONFLICT (id) DO UPDATE
        SET doses = EXCLUDED.doses, updated_at = now()
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可出提醒，落库留待重连后补写
  }
}
