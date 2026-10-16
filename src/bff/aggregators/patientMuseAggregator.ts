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

/* ================================================================== */
/* 【质量与新场景】M175-D：患者个人智能体深化（真帮患者，不只是看板）   */
/* ------------------------------------------------------------------ */
/* 说明：M117-A 的 buildPatientMuse 已沉淀「健康画像标签视图」；        */
/* M175-D 在此基础上把患者智能体从「看板」升级为「随身健康助手」：      */
/*   健康画像(疾病/用药/检查/过敏/家族史) / 就医偏好(时段/医生/缴费) / */
/*   健康目标(减重/控糖/降压/运动) / 健康提醒(服药/复查/体检/疫苗)，  */
/* 并主动产出洞察、服务推荐与进度跟踪。以下新函数均为纯函数、不打库。  */
/* 类型刻意另命名（ProfileMedication/MuseReminder/PatientMUSE），       */
/* 避免与上方 M117-A 的 PatientMedication/HealthReminder 发生接口合并。 */
/* ================================================================== */

/* ---------- 健康画像（深化） ---------- */

/** 一条慢病 / 既往诊断 */
export interface MuseDisease {
  name: string;
  since?: string;
  status: 'controlled' | 'monitoring' | 'unstable';
}

/** 一条在用药物（深化版：含剂量/服法/依从性） */
export interface ProfileMedication {
  drug: string;
  dose: string;
  frequency: string;
  adherence?: 'good' | 'partial' | 'poor';
}

/** 一项近期检查检验 */
export interface ProfileCheckup {
  item: string;
  date: string;
  result: 'normal' | 'abnormal' | 'pending';
  note?: string;
}

/** 一条过敏史（深化版：明确反应） */
export interface ProfileAllergy {
  allergen: string;
  reaction: string;
}

/** 一条家族史 */
export interface ProfileFamilyHistory {
  relation: string;
  condition: string;
}

/** 患者健康画像（深化聚合视图） */
export interface DeepHealthProfile {
  diseases: MuseDisease[];
  medications: ProfileMedication[];
  checkups: ProfileCheckup[];
  allergies: ProfileAllergy[];
  familyHistory: ProfileFamilyHistory[];
}

/* ---------- 就医偏好 / 健康目标 / 健康提醒 ---------- */

/** 就诊时段偏好 */
export type VisitTime = 'morning' | 'forenoon' | 'afternoon' | 'evening';
/** 缴费方式 */
export type PaymentMethod = 'cash' | 'insurance' | 'mobile' | 'family_pay';

/** 患者就医偏好 */
export interface VisitPreferences {
  preferredTime: VisitTime;
  preferredDoctor?: string;
  preferredDept?: string;
  paymentMethod: PaymentMethod;
  reminderChannels: Array<'sms' | 'wechat' | 'voice'>;
}

/** 健康目标四大类 */
export type HealthGoalType = 'weight_loss' | 'glucose_control' | 'bp_control' | 'exercise';

export const GOAL_LABEL: Record<HealthGoalType, string> = {
  weight_loss: '减重',
  glucose_control: '控糖',
  bp_control: '降压',
  exercise: '运动',
};

/** 目标方向：减重/控糖/降压往下走，运动往上走 */
const GOAL_DIRECTION: Record<HealthGoalType, 'down' | 'up'> = {
  weight_loss: 'down',
  glucose_control: 'down',
  bp_control: 'down',
  exercise: 'up',
};

/** 一条健康目标 */
export interface DeepHealthGoal {
  type: HealthGoalType;
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  startDate: string;
  deadline: string;
}

/** 健康提醒四大类 */
export type MuseReminderType = 'medication' | 'recheck' | 'checkup' | 'vaccine';

export const MUSE_REMINDER_LABEL: Record<MuseReminderType, string> = {
  medication: '服药',
  recheck: '复查',
  checkup: '体检',
  vaccine: '疫苗',
};

/** 一条健康提醒（深化版：含应办日期与优先级） */
export interface MuseReminder {
  type: MuseReminderType;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
}

/* ---------- 智能洞察 / 个人智能体全景 ---------- */

/** 一条智能体主动洞察（不是数据复述，而是替患者发现的问题） */
export interface PatientInsight {
  kind: 'adherence' | 'allergy_risk' | 'family_risk' | 'abnormal_lab';
  level: 'high' | 'medium' | 'low';
  message: string;
  action: string;
}

/** buildPatientMUSE 输出：患者个人智能体全景 */
export interface PatientMUSE {
  patientId: string;
  profile: DeepHealthProfile;
  preferences: VisitPreferences;
  goals: DeepHealthGoal[];
  reminders: MuseReminder[];
  insights: PatientInsight[];
  /** 健康风险分 0-100（越高越需关注） */
  riskScore: number;
  summary: string;
}

/** 内置演示画像：糖肾 + 高血压、依从性一般、糖化偏高、父系糖尿病家族史 */
function demoDeepProfile(): DeepHealthProfile {
  return {
    diseases: [
      { name: '2型糖尿病', since: '2022-03-01', status: 'monitoring' },
      { name: '原发性高血压2级', since: '2020-06-15', status: 'controlled' },
    ],
    medications: [
      { drug: '二甲双胍', dose: '0.5g', frequency: 'bid', adherence: 'partial' },
      { drug: '缬沙坦氨氯地平', dose: '80mg/5mg', frequency: 'qd', adherence: 'good' },
      { drug: '阿托伐他汀', dose: '20mg', frequency: 'qn', adherence: 'poor' },
    ],
    checkups: [
      { item: '糖化血红蛋白 HbA1c', date: '2026-09-20', result: 'abnormal', note: '7.8%（目标 <7.0%）' },
      { item: '低密度脂蛋白 LDL-C', date: '2026-09-20', result: 'abnormal', note: '3.6 mmol/L（目标 <2.6）' },
      { item: '尿微量白蛋白', date: '2026-09-20', result: 'normal', note: '正常' },
    ],
    allergies: [{ allergen: '磺胺类', reaction: '皮疹' }],
    familyHistory: [
      { relation: '父亲', condition: '2型糖尿病' },
      { relation: '母亲', condition: '高血压' },
    ],
  };
}

function demoDeepPreferences(): VisitPreferences {
  return {
    preferredTime: 'forenoon',
    preferredDoctor: '王主任（内分泌科）',
    preferredDept: '内分泌科',
    paymentMethod: 'mobile',
    reminderChannels: ['wechat', 'sms'],
  };
}

function demoDeepGoals(): DeepHealthGoal[] {
  return [
    { type: 'weight_loss', startValue: 82.5, currentValue: 79.8, targetValue: 75.0, unit: 'kg', startDate: '2026-07-01', deadline: '2026-12-31' },
    { type: 'glucose_control', startValue: 8.4, currentValue: 7.8, targetValue: 6.5, unit: '%', startDate: '2026-07-01', deadline: '2026-12-31' },
  ];
}

function demoDeepReminders(): MuseReminder[] {
  return [
    { type: 'medication', title: '阿托伐他汀 20mg 每晚一次', dueDate: '2026-10-16', priority: 'high' },
    { type: 'recheck', title: '糖尿病季度复查（糖化/肾功能）', dueDate: '2026-10-25', priority: 'high' },
    { type: 'checkup', title: '年度体检', dueDate: '2026-11-30', priority: 'medium' },
    { type: 'vaccine', title: '流感疫苗', dueDate: '2026-11-15', priority: 'low' },
  ];
}

/** 把画像信号翻译成「替患者着急」的洞察 */
function buildDeepInsights(profile: DeepHealthProfile): PatientInsight[] {
  const insights: PatientInsight[] = [];

  const poor = profile.medications.filter((m) => m.adherence === 'poor');
  const partial = profile.medications.filter((m) => m.adherence === 'partial');
  if (poor.length > 0) {
    insights.push({
      kind: 'adherence',
      level: 'high',
      message: `您「${poor.map((m) => m.drug).join('、')}」经常忘记吃，这是控制血脂/血糖的关键药。`,
      action: '已为您在手机设置每晚 21:00 服药提醒，吃完点一下「已服」。',
    });
  } else if (partial.length > 0) {
    insights.push({
      kind: 'adherence',
      level: 'medium',
      message: `您「${partial.map((m) => m.drug).join('、')}」偶尔漏服，长期下来血糖会波动。`,
      action: '建议把药放在牙刷旁，早餐后顺手服下。',
    });
  }

  const abnormal = profile.checkups.filter((c) => c.result === 'abnormal');
  if (abnormal.length > 0) {
    insights.push({
      kind: 'abnormal_lab',
      level: 'high',
      message: `最近有 ${abnormal.length} 项指标偏高：${abnormal.map((c) => c.item).join('、')}。`,
      action: '已按您偏好展示上午门诊复查号源，一键预约即可。',
    });
  }

  const dadDiabetes = profile.familyHistory.some(
    (f) => f.condition.includes('糖尿病') && f.relation.includes('父'),
  );
  if (dadDiabetes) {
    insights.push({
      kind: 'family_risk',
      level: 'medium',
      message: '您父亲有糖尿病史，您本人也是糖友，属高危人群。',
      action: '建议每年加做一次眼底与尿微量白蛋白筛查，预防并发症。',
    });
  }

  if (profile.allergies.length > 0) {
    insights.push({
      kind: 'allergy_risk',
      level: 'medium',
      message: `您对${profile.allergies.map((a) => a.allergen).join('、')}过敏，就诊与取药时系统会自动拦截同类药。`,
      action: '请主动告知接诊医生，切勿自行购买复方感冒药。',
    });
  }

  return insights;
}

/** 由洞察与控制状态估算健康风险分（0-100，越高越需关注） */
function calcDeepRiskScore(profile: DeepHealthProfile, insights: PatientInsight[]): number {
  let score = 0;
  for (const ins of insights) score += ins.level === 'high' ? 25 : ins.level === 'medium' ? 12 : 5;
  score += profile.diseases.filter((d) => d.status === 'unstable').length * 10;
  return Math.min(100, score);
}

/**
 * buildPatientMUSE：构建患者个人智能体（纯函数）。
 * 一次聚合健康画像 / 就医偏好 / 健康目标 / 健康提醒，并主动产出洞察。
 *
 * @param patientId 患者标识（脱敏后传入）
 * @param seed      可选：外部注入结构化数据；缺省用内置演示画像，
 *                  保证端点开箱即有「真帮患者」的洞察可看。
 */
export function buildPatientMUSE(
  patientId: string,
  seed?: Partial<{
    profile: DeepHealthProfile;
    preferences: VisitPreferences;
    goals: DeepHealthGoal[];
    reminders: MuseReminder[];
  }>,
): PatientMUSE {
  const profile = seed?.profile ?? demoDeepProfile();
  const preferences = seed?.preferences ?? demoDeepPreferences();
  const goals = seed?.goals ?? demoDeepGoals();
  const reminders = seed?.reminders ?? demoDeepReminders();

  const insights = buildDeepInsights(profile);
  const riskScore = calcDeepRiskScore(profile, insights);

  const summary = riskScore >= 50
    ? '您有几项指标需要重点关注，已为您预约复查并设好服药提醒，照着做就能稳住。'
    : riskScore >= 25
      ? '整体平稳，注意按时服药、定期复查，把好的习惯保持住。'
      : '各项指标控制得不错，继续保持规律作息与运动。';

  return { patientId, profile, preferences, goals, reminders, insights, riskScore, summary };
}

/* ---------- 患者经验记录 ---------- */

/** 患者随手记录的一条经验 */
export interface PatientExperienceInput {
  kind: 'symptom' | 'medication' | 'visit' | 'lifestyle';
  title: string;
  detail?: string;
  /** 自评分 1-5，越高越重/越差 */
  severity?: number;
  recordedAt?: string;
}

export const EXPERIENCE_KIND_LABEL: Record<PatientExperienceInput['kind'], string> = {
  symptom: '症状记录',
  medication: '用药反馈',
  visit: '就诊感受',
  lifestyle: '生活记录',
};

/** recordPatientExperience 输出 */
export interface RecordedPatientExperience {
  patientId: string;
  kind: PatientExperienceInput['kind'];
  kindLabel: string;
  title: string;
  detail: string;
  severity: number;
  level: 'low' | 'medium' | 'high';
  tags: string[];
  /** 是否建议护士/医生主动随访 */
  needsFollowUp: boolean;
  recordedAt: string;
  plainMessage: string;
}

/** 关键词 → 标签词典 */
const TAG_DICT: ReadonlyArray<{ tag: string; keywords: string[] }> = [
  { tag: '低血糖', keywords: ['心慌', '出冷汗', '手抖', '饥饿', '低血糖'] },
  { tag: '高血糖', keywords: ['口渴', '多饮', '多尿', '血糖高', '口干'] },
  { tag: '血压', keywords: ['头晕', '头胀', '血压', '头痛'] },
  { tag: '服药困难', keywords: ['忘吃', '忘记吃', '漏服', '副作用', '恶心', '胃'] },
  { tag: '饮食', keywords: ['吃多', '嘴馋', '主食', '米饭', '甜食', '外卖'] },
  { tag: '运动', keywords: ['走路', '跑步', '运动', '锻炼', '散步'] },
  { tag: '情绪睡眠', keywords: ['失眠', '睡不好', '焦虑', '情绪', '累'] },
];

/**
 * recordPatientExperience：记录患者经验（纯函数）。
 * 把患者大白话记录结构化：归一化严重度、关键词打标签、红旗症状判随访。
 */
export function recordPatientExperience(
  patientId: string,
  experience: PatientExperienceInput,
): RecordedPatientExperience {
  const title = (experience.title ?? '').trim();
  const detail = (experience.detail ?? '').trim();
  const text = `${title} ${detail}`;

  const severity = Math.max(1, Math.min(5, Math.round(experience.severity ?? 3)));
  const level: RecordedPatientExperience['level'] = severity >= 5 ? 'high' : severity >= 3 ? 'medium' : 'low';

  const tags = TAG_DICT.filter((d) => d.keywords.some((k) => text.includes(k))).map((d) => d.tag);

  const redFlag = tags.some((t) => t === '低血糖' || t === '高血糖') || severity >= 5;

  return {
    patientId,
    kind: experience.kind,
    kindLabel: EXPERIENCE_KIND_LABEL[experience.kind],
    title,
    detail,
    severity,
    level,
    tags,
    needsFollowUp: redFlag,
    recordedAt: experience.recordedAt ?? new Date().toISOString(),
    plainMessage: redFlag
      ? '已收到您的记录，情况需要关注：护士会在 1 个工作日内主动联系您指导处理，期间如有加重请立即就医。'
      : '已记下您的感受，继续保持，下次复诊时医生会看到这条记录。',
  };
}

/* ---------- 个性化服务推荐 ---------- */

/** 推荐上下文 */
export interface PatientServiceContext {
  symptoms?: string[];
  knownConditions?: string[];
  medicationAdherence?: 'good' | 'partial' | 'poor';
  focusGoal?: HealthGoalType;
  hasAbnormalLab?: boolean;
}

/** 一条推荐服务 */
export interface PatientServiceItem {
  type: 'appointment' | 'education' | 'followup' | 'checkup' | 'diet' | 'exercise' | 'medication_reminder';
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

export interface PatientServiceRecommendation {
  patientId: string;
  services: PatientServiceItem[];
  summary: string;
}

/**
 * recommendPatientService：个性化服务推荐（纯函数）。
 * 按画像与上下文推荐「下一步真正该做的事」，按优先级排序。
 */
export function recommendPatientService(
  patientId: string,
  context: PatientServiceContext = {},
): PatientServiceRecommendation {
  const services: PatientServiceItem[] = [];

  const isDiabetic = (context.knownConditions ?? []).some((c) => c.includes('糖尿'));
  const hasHighSugar = (context.symptoms ?? []).some((s) =>
    ['口渴', '多饮', '多尿', '血糖高', '头晕'].includes(s),
  );

  if (context.hasAbnormalLab) {
    services.push({
      type: 'appointment',
      title: '预约内分泌科复查门诊',
      reason: '近期糖化/血脂偏高，需要医生调整方案',
      priority: 'high',
      action: '已按您偏好的上午时段，展示可约号源，一键挂号。',
    });
  }
  if (hasHighSugar) {
    services.push({
      type: 'followup',
      title: '护士主动随访指导',
      reason: '您记录了「口渴/多饮/头晕」，可能血糖波动',
      priority: 'high',
      action: '留下联系方式，护士将在 1 个工作日内回电指导，必要时提前就诊。',
    });
  }
  if (context.medicationAdherence === 'poor' || context.medicationAdherence === 'partial') {
    services.push({
      type: 'medication_reminder',
      title: '设置智能服药提醒',
      reason: '您近期有漏服情况，长期用药靠坚持',
      priority: 'medium',
      action: '按用药时间自动推送提醒，支持家属代提醒与「已服」打卡。',
    });
  }
  if (isDiabetic) {
    services.push({
      type: 'diet',
      title: '低糖饮食个性化食谱',
      reason: '控糖一半靠嘴，按您口味定制一周低糖菜单',
      priority: 'medium',
      action: '查看「主食换杂粮、先菜后饭」的一周可执行食谱。',
    });
    services.push({
      type: 'exercise',
      title: '餐后散步运动处方',
      reason: '餐后 30 分钟快走有助平稳血糖',
      priority: 'low',
      action: '每天三餐后快走 20 分钟，App 自动记录步数与时长。',
    });
  }
  if (context.focusGoal === 'weight_loss') {
    services.push({
      type: 'education',
      title: '科学减重：每月 2-4 斤为宜',
      reason: '您的目标是减重，匀速减重更易坚持、不伤代谢',
      priority: 'low',
      action: '查看「热量缺口 300kcal」的减重科普与打卡计划。',
    });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  services.sort((a, b) => order[a.priority] - order[b.priority]);

  const summary = services.length === 0
    ? '当前没有紧急事项，保持规律作息、按时复查即可。'
    : services[0].priority === 'high'
      ? `有需要优先处理的事项，建议今天就安排：${services[0].title}。`
      : '为您整理了几条适合当前阶段的健康服务建议，按优先级排列。';

  return { patientId, services, summary };
}

/* ---------- 健康进度跟踪 ---------- */

/** trackPatientHealthProgress 输入 */
export interface HealthProgressGoal {
  type: HealthGoalType;
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  daysElapsed: number;
  daysTotal: number;
}

export interface HealthProgress {
  patientId: string;
  type: HealthGoalType;
  typeLabel: string;
  unit: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  timePercent: number;
  achieved: boolean;
  status: 'achieved' | 'on_track' | 'at_risk' | 'off_track';
  trend: 'improving' | 'stable' | 'worsening';
  nextAction: string;
}

/**
 * trackPatientHealthProgress：健康进度跟踪（纯函数）。
 * 真实进度 = 已改善幅度 / 计划改善幅度；方向按类型自动判定。
 *   已达标 → achieved；真实进度 ≥ 时间×0.9 → on_track；
 *   ≥ 时间×0.6 → at_risk；否则 off_track。
 */
export function trackPatientHealthProgress(
  patientId: string,
  goal: HealthProgressGoal,
): HealthProgress {
  const direction = GOAL_DIRECTION[goal.type];
  const { startValue: start, currentValue: current, targetValue: target } = goal;

  const improved = direction === 'down' ? start - current : current - start;
  const total = direction === 'down' ? start - target : target - start;
  const achieved = direction === 'down' ? current <= target : current >= target;

  let progress = total > 0 ? (improved / total) * 100 : 100;
  progress = Math.round(Math.max(0, Math.min(100, achieved ? 100 : progress)) * 10) / 10;

  const time = goal.daysTotal > 0
    ? Math.round(Math.max(0, Math.min(100, (goal.daysElapsed / goal.daysTotal) * 100)) * 10) / 10
    : 0;

  let trend: HealthProgress['trend'] = 'stable';
  if (improved > 0.05) trend = 'improving';
  else if (improved < -0.05) trend = 'worsening';

  let status: HealthProgress['status'];
  if (achieved) status = 'achieved';
  else if (progress >= time * 0.9) status = 'on_track';
  else if (progress >= time * 0.6) status = 'at_risk';
  else status = 'off_track';

  let nextAction: string;
  if (status === 'achieved') {
    nextAction = '目标已达成！建议把当前值维持 3 个月，并把目标值再下调一档，巩固成果。';
  } else if (status === 'on_track') {
    nextAction = '节奏不错，照当前的饮食/用药/运动坚持下去，到期就能达标。';
  } else if (status === 'at_risk') {
    nextAction = '进度略慢于时间，建议下次复诊时请医生微调方案，并把每日打卡补上。';
  } else {
    nextAction = '进度明显落后，建议尽快预约医生评估，先排查用药依从性与饮食记录。';
  }

  return {
    patientId,
    type: goal.type,
    typeLabel: GOAL_LABEL[goal.type],
    unit: goal.unit,
    startValue: start,
    currentValue: current,
    targetValue: target,
    progressPercent: progress,
    timePercent: time,
    achieved,
    status,
    trend,
    nextAction,
  };
}
