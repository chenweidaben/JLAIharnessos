/**
 * 健澜科技 jlmedaios - 住院医生工作站「越用越懂患者」聚合器
 *   （依据宪法第四章：AI 原生医院以患者为中心，逐日沉淀病情演变记忆）
 *
 * 纯函数核心（可单测、不触库、不依赖时间）：
 *  - buildInpatientInsight(events, labs, orders)
 *      汇总当日病情演变 → { keyEvents, riskFlags, aiSummary }，
 *      其中 aiSummary 即面向住院医生的「今日重点关注」一段话。
 *  - summarizeCrossVisits(patientId, allVisits)
 *      跨住院次数合并既往药物反应 / 并发症 / 诊疗偏好，输出一段供本次
 *      开医嘱时参考的脱敏提示文本。
 *
 * 视图层 getInpatientInsight(view, patientId)：
 *  - 权限 medmuse:view；
 *  - DEMO_MODE 或库内无当日记录时回退确定性演示洞察（demo=true），
 *    查询失败绝不向路由层抛 500；
 *  - 响应仅含院内脱敏 patientId 与临床标签，不含姓名 / 身份证号 / 床号明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '@/db/pool.js';
import { getEnv } from '../config/env.js';
import type { AuthView } from '../view/userView.js';

export class InpatientInsightError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'InpatientInsightError';
  }
}

/* ------------------------------- 类型契约 ------------------------------- */

/** 当日病情事件（生命体征 / 护理 / 处置 / 病程 / 告警 / 转科 / 手术） */
export interface InpatientEvent {
  /** 事件发生时间（ISO 8601） */
  time: string;
  /** 事件大类 */
  type: 'vitals' | 'nursing' | 'treatment' | 'note' | 'alert' | 'transfer' | 'surgery';
  /** 事件标题（如「测体温」「急诊会诊」） */
  title: string;
  /** 补充说明（可选） */
  detail?: string;
  /** 体温（℃），type=vitals 时填写 */
  temperatureC?: number;
  /** 心率（次/分） */
  heartRate?: number;
  /** 收缩压（mmHg） */
  systolicBp?: number;
  /** 舒张压（mmHg） */
  diastolicBp?: number;
  /** 呼吸频率（次/分） */
  respiratoryRate?: number;
  /** 血氧饱和度（%） */
  spo2?: number;
}

/** 当日检验结果 */
export interface LabResult {
  /** 项目编码（如 WBC / CRP / K+） */
  code: string;
  /** 项目中文名 */
  name: string;
  /** 结果值 */
  value: number;
  /** 单位 */
  unit: string;
  /** 参考下限（可选） */
  refLow?: number;
  /** 参考上限（可选） */
  refHigh?: number;
  /** 人工标记：HH/LL 危急，H/L 异常，N 正常 */
  flag?: 'HH' | 'LL' | 'H' | 'L' | 'N';
  /** 报告时间（ISO 8601） */
  time: string;
}

/** 当日医嘱条目 */
export interface OrderItem {
  /** 医嘱号 */
  id: string;
  /** 医嘱名称 */
  name: string;
  /** 医嘱大类 */
  category: 'medication' | 'lab' | 'imaging' | 'nursing' | 'diet' | 'procedure';
  /** 执行状态 */
  status: 'pending' | 'completed' | 'cancelled' | 'held';
  /** 开始时间（ISO 8601，可选） */
  startTime?: string;
}

/** 关键病情事件（输出视图） */
export interface KeyEvent {
  time: string;
  type: InpatientEvent['type'];
  title: string;
  /** 是否为需医生重点关注的高亮事件 */
  highlight: boolean;
}

/** 风险标记（输出视图） */
export interface RiskFlag {
  /** 风险码（fever / hypoxemia / critical_lab / med_held …） */
  code: string;
  level: 'low' | 'medium' | 'high';
  /** 面向医生的一句话描述 */
  message: string;
  /** 触发证据（数值 / 医嘱号），便于复核 */
  evidence: string;
}

/** buildInpatientInsight 返回结构 */
export interface InpatientInsight {
  keyEvents: KeyEvent[];
  riskFlags: RiskFlag[];
  aiSummary: string;
}

/** 既往住院记录（跨次合并入参） */
export interface PriorVisit {
  visitId: string;
  admissionDate: string;
  dischargeDate?: string;
  mainDiagnosis: string;
  /** 药物反应 / 过敏（如「青霉素过敏」「造影剂肾病」） */
  drugReactions?: string[];
  /** 住院期间并发症 */
  complications?: string[];
  /** 患者诊疗偏好（如「拒绝输血」「镇痛敏感」） */
  preferences?: string[];
}

/** getInpatientInsight 视图 */
export interface InpatientInsightView extends InpatientInsight {
  patientId: string;
  insightDate: string;
  /** true 表示无当日库内记录时的演示/空态基线 */
  demo: boolean;
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * maskPatientId：院内患者号脱敏展示。
 *
 * 口径：长度 > 5 时保留前 3 位与末 2 位，中间以 **** 替换；
 *       短号一律回退 P****。纯函数，不抛错。
 *
 * @param patientId 院内患者号
 * @returns 脱敏后的展示串
 */
export function maskPatientId(patientId: string): string {
  const id = (patientId ?? '').trim();
  if (id.length <= 5) return 'P****';
  return `${id.slice(0, 3)}****${id.slice(-2)}`;
}

/**
 * buildInpatientInsight：汇总当日病情演变，输出「今日重点关注」。
 *
 * 口径（依据宪法第四章，规则全部可解释、可单测）：
 *  - keyEvents：当日事件按时间升序；type ∈ {alert, surgery, transfer}
 *    或事件触发了风险阈值者 highlight=true；最多保留 20 条；
 *  - riskFlags：
 *      · 体温 ≥38.5℃ → fever(high)，≥37.3℃ → fever(low)；
 *      · 心率 ≥110 → tachycardia(medium)，≤50 → bradycardia(medium)；
 *      · 收缩压 ≤90 → hypotension(high)，≥180 → hypertension(medium)；
 *      · SpO₂ ≤92% → hypoxemia(high)；呼吸 ≥24 → tachypnea(medium)；
 *      · 检验 flag=HH/LL → critical_lab(high)，flag=H/L → abnormal_lab(medium)；
 *      · 用药医嘱 status=held → med_held(medium)；
 *  - aiSummary：按「病情演变 → 异常检验 → 用药变动 → 重点关注」四段式
 *    拼成一段中文，空态时返回「今日暂无显著病情变化，继续观察。」
 *
 * 纯函数：不修改入参，不读时钟，不触库。
 *
 * @param events 当日病情事件（只读）
 * @param labs 当日检验结果（只读）
 * @param orders 当日医嘱（只读）
 */
export function buildInpatientInsight(
  events: readonly InpatientEvent[],
  labs: readonly LabResult[],
  orders: readonly OrderItem[],
): InpatientInsight {
  const sortedEvents = [...events].sort((a, b) => a.time.localeCompare(b.time));

  // ---- 风险标记 ----
  const riskFlags: RiskFlag[] = [];
  const highlightTimes = new Set<string>();

  for (const e of sortedEvents) {
    if (e.temperatureC !== undefined) {
      if (e.temperatureC >= 38.5) {
        riskFlags.push({ code: 'fever', level: 'high', message: `高热 ${e.temperatureC}℃`, evidence: e.time });
        highlightTimes.add(e.time);
      } else if (e.temperatureC >= 37.3) {
        riskFlags.push({ code: 'fever', level: 'low', message: `低热 ${e.temperatureC}℃`, evidence: e.time });
      }
    }
    if (e.heartRate !== undefined) {
      if (e.heartRate >= 110) {
        riskFlags.push({ code: 'tachycardia', level: 'medium', message: `心动过速 ${e.heartRate} 次/分`, evidence: e.time });
        highlightTimes.add(e.time);
      } else if (e.heartRate <= 50) {
        riskFlags.push({ code: 'bradycardia', level: 'medium', message: `心动过缓 ${e.heartRate} 次/分`, evidence: e.time });
      }
    }
    if (e.systolicBp !== undefined) {
      if (e.systolicBp <= 90) {
        riskFlags.push({ code: 'hypotension', level: 'high', message: `低血压 收缩压 ${e.systolicBp}mmHg`, evidence: e.time });
        highlightTimes.add(e.time);
      } else if (e.systolicBp >= 180) {
        riskFlags.push({ code: 'hypertension', level: 'medium', message: `血压升高 收缩压 ${e.systolicBp}mmHg`, evidence: e.time });
      }
    }
    if (e.spo2 !== undefined && e.spo2 <= 92) {
      riskFlags.push({ code: 'hypoxemia', level: 'high', message: `低氧血症 SpO₂ ${e.spo2}%`, evidence: e.time });
      highlightTimes.add(e.time);
    }
    if (e.respiratoryRate !== undefined && e.respiratoryRate >= 24) {
      riskFlags.push({ code: 'tachypnea', level: 'medium', message: `呼吸急促 ${e.respiratoryRate} 次/分`, evidence: e.time });
    }
    if (e.type === 'alert' || e.type === 'surgery' || e.type === 'transfer') {
      highlightTimes.add(e.time);
    }
  }

  for (const l of labs) {
    if (l.flag === 'HH' || l.flag === 'LL') {
      riskFlags.push({
        code: 'critical_lab', level: 'high',
        message: `危急值 ${l.name} ${l.value}${l.unit}`,
        evidence: `${l.code}@${l.time}`,
      });
    } else if (l.flag === 'H' || l.flag === 'L') {
      riskFlags.push({
        code: 'abnormal_lab', level: 'medium',
        message: `异常 ${l.name} ${l.flag === 'H' ? '↑' : '↓'} ${l.value}${l.unit}`,
        evidence: `${l.code}@${l.time}`,
      });
    }
  }

  for (const o of orders) {
    if (o.category === 'medication' && o.status === 'held') {
      riskFlags.push({
        code: 'med_held', level: 'medium',
        message: `用药暂停：${o.name}`,
        evidence: o.id,
      });
    }
  }

  // ---- 关键事件 ----
  const keyEvents: KeyEvent[] = sortedEvents.slice(0, 20).map((e) => ({
    time: e.time,
    type: e.type,
    title: e.title,
    highlight: highlightTimes.has(e.time) || e.type === 'alert' || e.type === 'surgery' || e.type === 'transfer',
  }));

  // ---- 今日重点关注一段话 ----
  const fever = riskFlags.find((r) => r.code === 'fever');
  const hypoxemia = riskFlags.find((r) => r.code === 'hypoxemia');
  const criticalLabs = labs.filter((l) => l.flag === 'HH' || l.flag === 'LL');
  const abnormalLabs = labs.filter((l) => l.flag === 'H' || l.flag === 'L');
  const heldMeds = orders.filter((o) => o.category === 'medication' && o.status === 'held');
  const highRisks = riskFlags.filter((r) => r.level === 'high');

  const parts: string[] = [];
  if (fever || hypoxemia || sortedEvents.length > 0) {
    const evol: string[] = [];
    if (fever) evol.push(fever.message);
    if (hypoxemia) evol.push(hypoxemia.message);
    const notable = sortedEvents.filter((e) => e.type === 'treatment' || e.type === 'surgery' || e.type === 'transfer');
    if (notable.length > 0) evol.push(`完成 ${notable.length} 项重点处置/操作`);
    parts.push(evol.length > 0 ? `病情演变：${evol.join('，')}。` : '病情演变：生命体征总体平稳。');
  }
  if (criticalLabs.length > 0 || abnormalLabs.length > 0) {
    const labBits: string[] = [];
    if (criticalLabs.length > 0) labBits.push(`危急值 ${criticalLabs.map((l) => l.name).join('、')}`);
    if (abnormalLabs.length > 0) labBits.push(`异常 ${abnormalLabs.length} 项`);
    parts.push(`检验：${labBits.join('，')}，建议结合临床复评。`);
  }
  if (heldMeds.length > 0) {
    parts.push(`用药变动：${heldMeds.map((m) => m.name).join('、')} 已暂停，需评估恢复时机。`);
  }
  if (highRisks.length > 0) {
    parts.push(`重点关注：${highRisks.map((r) => r.message).join('；')}。`);
  }
  const aiSummary = parts.length > 0
    ? parts.join('')
    : '今日暂无显著病情变化，继续观察。';

  return { keyEvents, riskFlags, aiSummary };
}

/**
 * summarizeCrossVisits：跨住院次数合并既往反应，输出脱敏提示文本。
 *
 * 口径：
 *  - 按 admissionDate 倒序排列，取最近一次住院的主诊作为背景；
 *  - 汇总所有既往住院的 drugReactions / complications / preferences（去重）；
 *  - 患者号脱敏展示（maskPatientId），绝不输出姓名/床号；
 *  - 无既往住院时返回固定空态句。
 *
 * 纯函数：不修改入参，不触库。
 *
 * @param patientId 院内患者号
 * @param allVisits 该患者全部既往住院记录（只读）
 */
export function summarizeCrossVisits(patientId: string, allVisits: readonly PriorVisit[]): string {
  const masked = maskPatientId(patientId);
  if (!allVisits || allVisits.length === 0) {
    return `患者 ${masked} 无既往住院记录可供参考。`;
  }
  const sorted = [...allVisits].sort((a, b) => b.admissionDate.localeCompare(a.admissionDate));
  const latest = sorted[0];
  const unique = (arr: readonly (string[] | undefined)[]): string[] =>
    [...new Set(arr.flatMap((x) => x ?? []))];

  const reactions = unique(sorted.map((v) => v.drugReactions));
  const complications = unique(sorted.map((v) => v.complications));
  const preferences = unique(sorted.map((v) => v.preferences));

  const bits: string[] = [
    `患者 ${masked} 既往住院 ${sorted.length} 次`,
    `最近 ${latest.admissionDate.slice(0, 10)} 主诊「${latest.mainDiagnosis}」`,
  ];
  if (reactions.length > 0) bits.push(`药物反应：${reactions.join('、')}`);
  if (complications.length > 0) bits.push(`曾出现并发症：${complications.join('、')}`);
  if (preferences.length > 0) bits.push(`诊疗偏好：${preferences.join('、')}`);

  let suffix = '';
  if (reactions.length > 0) {
    suffix = '本次开医嘱请规避上述药物反应相关类别。';
  } else if (preferences.length > 0) {
    suffix = '本次诊疗请尊重患者既往偏好。';
  }
  return `${bits.join('，')}。${suffix}`;
}

/* ------------------------------- 演示基线 ------------------------------ */

/** 确定性演示洞察（DEMO_MODE / 空库兜底用） */
function demoInsight(patientId: string, insightDate: string): InpatientInsightView {
  const built = buildInpatientInsight(
    [
      { time: `${insightDate}T06:00:00+08:00`, type: 'vitals', title: '晨间测体温', temperatureC: 37.8, heartRate: 96, systolicBp: 128, diastolicBp: 78, spo2: 97, respiratoryRate: 18 },
      { time: `${insightDate}T10:30:00+08:00`, type: 'treatment', title: '呼吸科会诊' },
    ],
    [
      { code: 'CRP', name: 'C反应蛋白', value: 18.2, unit: 'mg/L', flag: 'H', refLow: 0, refHigh: 8, time: `${insightDate}T08:00:00+08:00` },
    ],
    [
      { id: 'ORD-DEMO-1', name: '头孢呋辛 1.5g 静滴', category: 'medication', status: 'completed' },
    ],
  );
  return { patientId, insightDate, demo: true, ...built };
}

/* ------------------------------- 数据装载 ------------------------------ */

interface RawRow {
  id: string;
  patient_id: string;
  visit_id: string;
  insight_date: string;
  key_events: unknown;
  risk_flags: unknown;
  ai_summary: string | null;
  created_at: string;
}

/** 权限断言：medmuse:view */
function assertPermission(view: AuthView): void {
  if (!view.permissions.includes('medmuse:view')) {
    throw new InpatientInsightError(403, '无权限：需要 medmuse:view');
  }
}

/* ------------------------------- 对外入口 ------------------------------ */

/**
 * getInpatientInsight：返回某住院患者当日病情洞察。
 *
 * 权限 medmuse:view；DEMO_MODE 或库内无当日记录时回退演示基线（demo=true）；
 * 查询失败回退空态演示，绝不向路由层抛 500。
 *
 * @param view 当前登录用户（含权限清单）
 * @param patientId 院内患者号
 * @param insightDate 洞察日期（YYYY-MM-DD，缺省取今日）
 */
export async function getInpatientInsight(
  view: AuthView,
  patientId: string,
  insightDate?: string,
): Promise<InpatientInsightView> {
  assertPermission(view);
  const pid = (patientId ?? '').trim();
  if (!pid) throw new InpatientInsightError(400, 'patientId 不能为空');
  const today = insightDate ?? new Date().toISOString().slice(0, 10);

  if (getEnv().demoMode) {
    return demoInsight(pid, today);
  }

  try {
    const db = getDb();
    const rows = await db`
      SELECT id, patient_id, visit_id, insight_date, key_events, risk_flags, ai_summary, created_at
      FROM medmuse.inpatient_daily_insight
      WHERE patient_id = ${pid} AND insight_date = ${today}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const row = rows[0] as RawRow | undefined;
    if (!row) return demoInsight(pid, today);
    return {
      patientId: row.patient_id,
      insightDate: typeof row.insight_date === 'string' ? row.insight_date.slice(0, 10) : String(row.insight_date),
      demo: false,
      keyEvents: (row.key_events as KeyEvent[]) ?? [],
      riskFlags: (row.risk_flags as RiskFlag[]) ?? [],
      aiSummary: row.ai_summary ?? '',
    };
  } catch {
    return demoInsight(pid, today);
  }
}
