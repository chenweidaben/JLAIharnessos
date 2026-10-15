/**
 * 健澜科技 jlmedaios - 患者 Personal Agent（Patient MUSE）健康画像聚合器（M117-A）
 *
 * 依据宪法第七章 7.7（患者 MUSE：为每一位患者沉淀「懂我病史与偏好」的个人健康助理）：
 *   从患者的就诊历史（history）、当前用药（medications）与最近回访（visits）中
 *   聚合「一眼读懂这位患者」的健康画像视图——慢性病标签（chronicConditions）、
 *   用药过敏史（allergies）、就医偏好标签（preferenceTags）与个性化健康提醒
 *   （healthReminders）。
 *
 * 设计要点：
 *  - buildPatientMuse 为纯函数：不打库、不读环境、不修改入参；便于单测与前端复用；
 *  - chronicConditions：history 中 chronic=true 的诊断名，去重去空白；
 *  - allergies：medications 中 allergy=true 的药物名（用药即过敏史），去重；
 *  - preferenceTags：按关键词规则从慢性病标签 + 最近就诊摘要中派生（如「糖尿病」
 *    → 血糖管理、多次复诊 → 复诊依从），去重、有序、可快照；
 *  - healthReminders：按画像规则派生提醒（慢病随访 / 过敏告知 / 用药配药 / 复诊间隔），
 *    级别 info < warning < critical；空画像时给出「完善档案」引导；
 *  - 任一入参为 null / undefined / 空数组时返回零值兜底视图，绝不抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 一条就诊/病史诊断记录 */
export interface PatientHistoryEntry {
  /** 诊断 / 慢性病名称 */
  condition?: string | null;
  /** 是否为慢性病（true 才进入 chronicConditions） */
  chronic?: boolean | null;
  /** 记录时间（ISO 8601，可选） */
  recordedAt?: string | null;
}

/** 一条当前用药记录 */
export interface PatientMedication {
  /** 药物名称 */
  drugName?: string | null;
  /** 是否为过敏药物（true 即计入过敏史） */
  allergy?: boolean | null;
  /** 用药状态：active / stopped / 其他（默认 active） */
  status?: string | null;
}

/** 一条最近回访/就诊记录 */
export interface PatientVisit {
  /** 就诊类型：门诊 / 住院 / 复诊 … */
  visitType?: string | null;
  /** 就诊日期（ISO 8601） */
  visitDate?: string | null;
  /** 就诊脱敏摘要 */
  summary?: string | null;
}

/** 健康提醒级别（info < warning < critical） */
export type ReminderLevel = 'info' | 'warning' | 'critical';

/** 一条个性化健康提醒 */
export interface HealthReminder {
  /** 提醒类别：chronic-care / allergy / refill / followup / profile */
  type: string;
  /** 提醒标题 */
  title: string;
  /** 提醒正文 */
  message: string;
  /** 级别 */
  level: ReminderLevel;
}

/** 患者 MUSE 健康画像视图（与前端 web/src/pages/patient/Muse 对齐） */
export interface PatientMuseView {
  /** 慢性病标签（去重，稳定有序） */
  chronicConditions: string[];
  /** 用药过敏史（去重，稳定有序） */
  allergies: string[];
  /** 就医偏好标签（去重，稳定有序） */
  preferenceTags: string[];
  /** 个性化健康提醒（按级别 critical → warning → info 排序） */
  healthReminders: HealthReminder[];
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** 复诊间隔阈值（天）：超过即提醒预约复诊 */
export const FOLLOWUP_DUE_DAYS = 90;

/** 关键词 → 偏好标签映射（命中即打标，顺序即标签稳定顺序） */
const KEYWORD_TAG_RULES: ReadonlyArray<{ keyword: string; tag: string }> = [
  { keyword: '糖尿病', tag: '血糖管理' },
  { keyword: '高血压', tag: '血压监测' },
  { keyword: '冠心病', tag: '心血管随访' },
  { keyword: '慢阻肺', tag: '呼吸康复' },
  { keyword: '哮喘', tag: '呼吸康复' },
  { keyword: '肾病', tag: '肾功能监测' },
  { keyword: '肿瘤', tag: '肿瘤随访' },
  { keyword: '过敏', tag: '过敏体质' },
];

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/** 清洗字符串：去空白；非法输入返回空串 */
function clean(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.trim();
}

/**
 * 有序去重：保持首次出现顺序，剔除空串。
 * 纯函数：不修改入参数组。
 */
function uniquePreserveOrder(items: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = clean(raw);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** 安全解析时间；非法输入返回 null */
function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/* ------------------------------------------------------------------ */
/* 偏好标签派生（纯函数）                                              */
/* ------------------------------------------------------------------ */

/**
 * derivePreferenceTags：从慢性病标签 + 最近就诊摘要 + 回访频次派生就医偏好标签。
 *
 * 口径：
 *  - 关键词命中：慢性病标签或最近摘要包含关键词 → 对应偏好标签；
 *  - 多次复诊：visits 中 visitType 含「复诊」≥2 次 → 追加「复诊依从」标签；
 *  - 活跃用药：active 用药 ≥3 种 → 追加「多药共管」标签。
 *
 * 纯函数：不修改入参；返回去重、有序标签。
 */
export function derivePreferenceTags(input: {
  chronicConditions: string[];
  lastSummary: string;
  revisitCount: number;
  activeMedCount: number;
}): string[] {
  const haystack = `${input.chronicConditions.join(' ')} ${input.lastSummary}`;
  const tags: string[] = [];
  for (const rule of KEYWORD_TAG_RULES) {
    if (haystack.includes(rule.keyword)) tags.push(rule.tag);
  }
  if (input.revisitCount >= 2) tags.push('复诊依从');
  if (input.activeMedCount >= 3) tags.push('多药共管');
  return uniquePreserveOrder(tags);
}

/* ------------------------------------------------------------------ */
/* 纯函数主入口                                                        */
/* ------------------------------------------------------------------ */

/**
 * buildPatientMuse：从就诊历史 + 用药 + 回访构建患者健康画像视图。
 *
 * 聚合口径：
 *  - chronicConditions：history 中 chronic=true 的 condition 去重；
 *  - allergies        ：medications 中 allergy=true 的 drugName 去重；
 *  - preferenceTags   ：见 derivePreferenceTags（关键词 / 复诊频次 / 多药）；
 *  - healthReminders  ：
 *      · 有慢性病 → chronic-care 级 warning，提醒定期复查；
 *      · 有过敏史 → allergy 级 critical，提醒就诊前主动告知；
 *      · 有活跃用药 → refill 级 info，提醒按时服药 / 配药；
 *      · 最近就诊距今 > FOLLOWUP_DUE_DAYS 天 → followup 级 warning；
 *      · 画像全空 → profile 级 info，引导完善档案；
 *    提醒按级别 critical → warning → info 排序，可快照。
 *
 * 纯函数：不修改入参；任一入参为 null / undefined / 空数组时返回零值兜底视图，
 *   不抛错。patientId 仅作冷启动上下文保留（聚合指标不依赖该字段）。
 *
 * @param patientId 院内脱敏患者号
 * @param history   就诊/病史诊断记录（可空）
 * @param medications 当前用药记录（可空）
 * @param visits    最近回访/就诊记录（可空）
 */
export function buildPatientMuse(
  patientId: string,
  history: PatientHistoryEntry[] | null | undefined,
  medications: PatientMedication[] | null | undefined,
  visits: PatientVisit[] | null | undefined,
): PatientMuseView {
  // patientId 仅作冷启动兜底上下文保留（无数据时同样输出零值视图）
  void patientId;

  // 1) 慢性病标签：history 中 chronic=true 的诊断名
  const chronicConditions = uniquePreserveOrder(
    (history ?? [])
      .filter((h) => Boolean(h) && h.chronic === true)
      .map((h) => h.condition),
  );

  // 2) 用药过敏史：medications 中 allergy=true 的药物名
  const allergies = uniquePreserveOrder(
    (medications ?? [])
      .filter((m) => Boolean(m) && m.allergy === true)
      .map((m) => m.drugName),
  );

  // 3) 活跃用药数（status 缺省视为 active）
  const activeMedCount = (medications ?? []).filter(
    (m) => Boolean(m) && (!m.status || clean(m.status) === '' || clean(m.status).toLowerCase() === 'active'),
  ).length;

  // 4) 最近一次回访：按 visitDate 倒序取最新
  const sortedVisits = (visits ?? [])
    .filter((v) => Boolean(v))
    .map((v) => ({ v, t: parseTime(v.visitDate) }))
    .sort((a, b) => (b.t ?? Number.NEGATIVE_INFINITY) - (a.t ?? Number.NEGATIVE_INFINITY));
  const lastVisit = sortedVisits[0]?.v ?? null;
  const lastSummary = clean(lastVisit?.summary);

  // 复诊次数：visitType 含「复诊」
  const revisitCount = sortedVisits.filter(({ v }) => clean(v.visitType).includes('复诊')).length;

  // 5) 偏好标签派生
  const preferenceTags = derivePreferenceTags({
    chronicConditions,
    lastSummary,
    revisitCount,
    activeMedCount,
  });

  // 6) 健康提醒派生
  const reminders: HealthReminder[] = [];

  if (allergies.length > 0) {
    reminders.push({
      type: 'allergy',
      title: '过敏史提醒',
      message: `就诊、开药前请主动告知过敏：${allergies.join('、')}`,
      level: 'critical',
    });
  }

  if (chronicConditions.length > 0) {
    reminders.push({
      type: 'chronic-care',
      title: '慢病随访提醒',
      message: `您有 ${chronicConditions.length} 项慢病（${chronicConditions.join('、')}），建议遵医嘱定期复查。`,
      level: 'warning',
    });
  }

  if (activeMedCount > 0) {
    reminders.push({
      type: 'refill',
      title: '用药与配药提醒',
      message: `当前在用 ${activeMedCount} 种药物，请按时服药，复诊时及时配药。`,
      level: 'info',
    });
  }

  // 复诊间隔：最近一次就诊距今超过阈值
  const lastTime = sortedVisits[0]?.t ?? null;
  if (lastTime !== null) {
    const daysSince = Math.floor((Date.now() - lastTime) / 86_400_000);
    if (daysSince > FOLLOWUP_DUE_DAYS) {
      reminders.push({
        type: 'followup',
        title: '复诊预约提醒',
        message: `距上次就诊已 ${daysSince} 天，建议尽快预约复诊。`,
        level: 'warning',
      });
    }
  }

  // 画像全空：引导完善档案
  if (
    chronicConditions.length === 0 &&
    allergies.length === 0 &&
    preferenceTags.length === 0 &&
    activeMedCount === 0
  ) {
    reminders.push({
      type: 'profile',
      title: '完善健康档案',
      message: '暂无健康画像数据，就诊后系统将自动为您沉淀慢病标签、过敏史与就医偏好。',
      level: 'info',
    });
  }

  // 提醒按级别排序：critical → warning → info
  const levelWeight: Record<ReminderLevel, number> = { critical: 0, warning: 1, info: 2 };
  reminders.sort((a, b) => levelWeight[a.level] - levelWeight[b.level]);

  return {
    chronicConditions,
    allergies,
    preferenceTags,
    healthReminders: reminders,
  };
}
