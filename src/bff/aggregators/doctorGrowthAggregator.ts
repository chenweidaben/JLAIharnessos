/**
 * 健澜科技 jlmedaios - M119-A 医生成长档案聚合器
 *
 * 依据宪法第七章（全角色 Personal Agent / 个人数据归属）：
 *   把一名医生沉淀的历史「场景 → 决策 → 结局 → 教训」决策记忆，
 *   汇总为可观测的个人成长档案——
 *     monthlyGrowth     月度成长折线（每月决策量 + 成功率）
 *     successTrend      成功率趋势（前半段 vs 后半段，Δ 与方向）
 *     lessonImprovement 教训闭环（失败教训 → 后续同标签成功）
 *     expertiseTags     专长标签（按出现频次排序）
 *     milestones        成长里程碑（首胜 / 首教训 / 专精达成…）
 *   computeRadarScores 再据此推出四维能力雷达（诊断 / 用药 / 沟通 / 管理）。
 *
 * 设计要点：
 *  - buildDoctorGrowthProfile / computeRadarScores 均为纯函数：不打库、不写全局、
 *    不抛错；入参 null / undefined / 脏值一律兜底，便于单测与前端本地复用；
 *  - 时间分桶使用 UTC 月份键（YYYY-MM），避免时区漂移导致快照不稳定；
 *  - 成功率口径与 staffMuseAggregator 一致：success 计入分子，total 计入分母，
 *    mixed 计入 total 但不计入 success；空月 / 空集成功率为 0；
 *  - 本模块只做岗位级聚合，不落患者姓名 / 身份证号等直接标识符。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 决策结局三态（与 medmuse.staff_decision_memory.outcome CHECK 一致） */
export type GrowthOutcome = 'success' | 'failure' | 'mixed';

/** 时间范围（ISO 日期 / 时间串均可；缺省时由决策时间戳自动兜底） */
export interface GrowthTimeRange {
  start?: string | null;
  end?: string | null;
}

/**
 * 一条喂给成长档案的决策记忆（路由层从 staff_decision_memory 塑形后传入）。
 * 所有字段按 unknown 接收，纯函数侧逐一收敛：
 *  - at        决策发生时间（ISO 串）
 *  - outcome   success / failure / mixed
 *  - specialty 专业方向（如「心血管内科」）
 *  - tag       经验标签（如「抗凝出血风险」）
 *  - lesson    事后复盘教训文本
 *  - dimension 可选：显式标注本条所属能力维度（diagnosis/medication/communication/management）
 */
export interface GrowthDecision {
  at?: unknown;
  outcome?: unknown;
  specialty?: unknown;
  tag?: unknown;
  lesson?: unknown;
  dimension?: unknown;
}

/** 月度成长折线一个点 */
export interface MonthlyGrowthPoint {
  /** YYYY-MM（UTC） */
  month: string;
  /** 当月决策总数 */
  decisions: number;
  success: number;
  failure: number;
  mixed: number;
  /** success / decisions（0~1，4 位小数；空月为 0） */
  successRate: number;
}

/** 成功率趋势：把区间内月份均分为前后两段比较 */
export interface SuccessTrend {
  /** 前半段加权成功率（0~1） */
  firstHalfRate: number;
  /** 后半段加权成功率（0~1） */
  secondHalfRate: number;
  /** secondHalfRate - firstHalfRate（4 位小数） */
  delta: number;
  direction: 'up' | 'down' | 'flat';
}

/** 教训闭环：失败教训是否在后续同标签决策中转化为成功 */
export interface LessonImprovement {
  /** 沉淀了 lesson 的决策数 */
  lessonsRecorded: number;
  /** 其中结局为 failure 的教训数 */
  failureLessons: number;
  /** 失败教训闭环数：该失败之后出现了同 tag 的成功决策 */
  closedLoops: number;
  /** closedLoops / failureLessons（0~1；无失败教训为 0） */
  improvementRate: number;
}

/** 一个专长标签 */
export interface ExpertiseTag {
  tag: string;
  count: number;
}

/** 成长里程碑 */
export interface GrowthMilestone {
  /** 发生时间（ISO 串，取自决策 at） */
  at: string;
  type:
    | 'first_decision'
    | 'first_success'
    | 'first_lesson'
    | 'tag_mastery'
    | 'decision_count';
  title: string;
  description: string;
}

/** buildDoctorGrowthProfile 的返回（前端折线 / 雷达 / 时间线直接消费） */
export interface DoctorGrowthProfile {
  monthlyGrowth: MonthlyGrowthPoint[];
  successTrend: SuccessTrend;
  lessonImprovement: LessonImprovement;
  expertiseTags: ExpertiseTag[];
  milestones: GrowthMilestone[];
}

/** 四维能力雷达（0~100 整数） */
export interface RadarScores {
  diagnosis: number;
  medication: number;
  communication: number;
  management: number;
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** 专长标签最多保留个数 */
const MAX_EXPERTISE_TAGS = 8;

/** 标签「专精达成」阈值：同一标签累计出现次数 */
const TAG_MASTERY_COUNT = 5;

/** 决策累计里程碑步长（每满 N 例记一条） */
const DECISION_STEP = 25;

/** 四维雷达关键词词典（命中标签文本即记一次加权命中） */
const RADAR_KEYWORDS: ReadonlyArray<{ dim: keyof RadarScores; words: readonly string[] }> = [
  { dim: 'diagnosis', words: ['诊断', '鉴别', '读片', '影像', '检验', '病情评估', '分诊', '查体'] },
  { dim: 'medication', words: ['药', '抗凝', '抗生素', '处方', '剂量', '相互作用', '输液', '给药'] },
  { dim: 'communication', words: ['沟通', '告知', '谈话', '患方', '满意度', '宣教', '知情', '安抚'] },
  { dim: 'management', words: ['管理', '路径', '质控', '流程', '成本', '医保', '病组', '随访', '排班'] },
];

/* ------------------------------------------------------------------ */
/* 基础收敛纯函数                                                       */
/* ------------------------------------------------------------------ */

/** toText：unknown → trim 后字符串；null / undefined / 空值返回 '' */
function toText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/** roundRate：成功率四舍五入到 4 位小数，避免浮点噪声 */
function roundRate(rate: number): number {
  return Math.round(rate * 10000) / 10000;
}

/** parseOutcome：宽松收敛结局三态，非法兜底 'mixed' */
function parseOutcome(v: unknown): GrowthOutcome {
  const s = toText(v).toLowerCase();
  if (s === 'success') return 'success';
  if (s === 'failure') return 'failure';
  return 'mixed';
}

/** parseAt：宽松解析时间戳 → 毫秒；非法 / 缺失返回 NaN（不抛错） */
function parseAt(v: unknown): number {
  const s = toText(v);
  if (!s) return NaN;
  const t = Date.parse(s);
  return Number.isNaN(t) ? NaN : t;
}

/** monthKey：毫秒 → UTC 'YYYY-MM' */
function monthKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${m < 10 ? '0' : ''}${m}`;
}

/** monthKeyToMs：'YYYY-MM' → 该月 1 号 UTC 0 点 */
function monthKeyToMs(key: string): number {
  const [y, m] = key.split('-').map((x) => parseInt(x, 10));
  if (!y || !m) return NaN;
  return Date.UTC(y, m - 1, 1);
}

/* ------------------------------------------------------------------ */
/* 主聚合                                                               */
/* ------------------------------------------------------------------ */

/**
 * buildDoctorGrowthProfile：从一名医生的历史决策记忆构建成长档案。
 *
 * 纯函数：不修改入参 decisions / timeRange；脏值一律兜底，绝不抛错。
 *
 * @param staffId   员工脱敏工号（仅透传，不参与计算）
 * @param timeRange 统计区间；start/end 缺失时用决策时间戳的最小/最大值兜底
 * @param decisions 历史决策记忆数组（null/undefined 按空集处理）
 */
export function buildDoctorGrowthProfile(
  staffId: string,
  timeRange: GrowthTimeRange | null | undefined,
  decisions: GrowthDecision[] | null | undefined,
): DoctorGrowthProfile {
  void staffId;

  // 1) 塑形 + 过滤出有效时间的决策
  const raw = Array.isArray(decisions) ? decisions : [];
  const items = raw
    .map((d) => {
      const at = parseAt(d?.at);
      return {
        atMs: at,
        atText: toText(d?.at),
        outcome: parseOutcome(d?.outcome),
        specialty: toText(d?.specialty),
        tag: toText(d?.tag),
        lesson: toText(d?.lesson),
      };
    })
    .filter((d) => !Number.isNaN(d.atMs))
    .sort((a, b) => a.atMs - b.atMs); // 时间升序，里程碑 / 闭环据此判定

  // 2) 解析区间；缺失则用数据自身最小/最大时间兜底
  let startMs = parseAt(timeRange?.start);
  let endMs = parseAt(timeRange?.end);
  if (Number.isNaN(startMs) && items.length > 0) startMs = items[0].atMs;
  if (Number.isNaN(endMs) && items.length > 0) endMs = items[items.length - 1].atMs;
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    // 完全无时间数据：返回空档案
    return emptyProfile();
  }
  if (startMs > endMs) [startMs, endMs] = [endMs, startMs];

  // 3) 月度分桶（含区间内空月，保证折线连续）
  const monthlyGrowth = buildMonthlyGrowth(items, startMs, endMs);

  // 4) 成功率趋势：把有决策的月份均分为前后两段
  const successTrend = buildSuccessTrend(monthlyGrowth);

  // 5) 教训闭环
  const lessonImprovement = buildLessonImprovement(items);

  // 6) 专长标签（频次降序，次键字典序）
  const expertiseTags = buildExpertiseTags(items);

  // 7) 里程碑
  const milestones = buildMilestones(items);

  return { monthlyGrowth, successTrend, lessonImprovement, expertiseTags, milestones };
}

/** 空档案兜底（无任何有效时间决策时） */
function emptyProfile(): DoctorGrowthProfile {
  return {
    monthlyGrowth: [],
    successTrend: { firstHalfRate: 0, secondHalfRate: 0, delta: 0, direction: 'flat' },
    lessonImprovement: { lessonsRecorded: 0, failureLessons: 0, closedLoops: 0, improvementRate: 0 },
    expertiseTags: [],
    milestones: [],
  };
}

/** 月度成长分桶：从 start 月到 end 月逐月填充，区间内决策累加到对应月 */
function buildMonthlyGrowth(
  items: Array<{ atMs: number; outcome: GrowthOutcome }>,
  startMs: number,
  endMs: number,
): MonthlyGrowthPoint[] {
  const buckets = new Map<string, MonthlyGrowthPoint>();
  const first = monthKey(startMs);
  const last = monthKey(endMs);

  // 预生成区间内所有月份（含空月），保证折线不断点
  let cursor = monthKeyToMs(first);
  const lastMs = monthKeyToMs(last);
  let guard = 0;
  while (!Number.isNaN(cursor) && cursor <= lastMs && guard < 1200) {
    const key = monthKey(cursor);
    buckets.set(key, {
      month: key,
      decisions: 0,
      success: 0,
      failure: 0,
      mixed: 0,
      successRate: 0,
    });
    // 推进到下一个月 1 号 UTC 0 点
    const d = new Date(cursor);
    cursor = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    guard += 1;
  }

  for (const it of items) {
    const key = monthKey(it.atMs);
    const bucket = buckets.get(key);
    if (!bucket) continue; // 区间外决策不计入折线
    bucket.decisions += 1;
    if (it.outcome === 'success') bucket.success += 1;
    else if (it.outcome === 'failure') bucket.failure += 1;
    else bucket.mixed += 1;
  }

  const points = [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
  for (const p of points) {
    p.successRate = p.decisions > 0 ? roundRate(p.success / p.decisions) : 0;
  }
  return points;
}

/** 成功率趋势：有决策的月份按时间均分前后两段，段内按决策数加权平均成功率 */
function buildSuccessTrend(monthly: MonthlyGrowthPoint[]): SuccessTrend {
  const active = monthly.filter((m) => m.decisions > 0);
  if (active.length === 0) {
    return { firstHalfRate: 0, secondHalfRate: 0, delta: 0, direction: 'flat' };
  }
  const mid = Math.ceil(active.length / 2);
  const first = active.slice(0, mid);
  const second = active.slice(mid);

  const weighted = (arr: MonthlyGrowthPoint[]): number => {
    const total = arr.reduce((s, m) => s + m.decisions, 0);
    if (total === 0) return 0;
    const succ = arr.reduce((s, m) => s + m.success, 0);
    return roundRate(succ / total);
  };

  const firstRate = weighted(first);
  const secondRate = weighted(second);
  const delta = roundRate(secondRate - firstRate);
  const direction: SuccessTrend['direction'] =
    Math.abs(delta) < 0.0001 ? 'flat' : delta > 0 ? 'up' : 'down';
  return { firstHalfRate: firstRate, secondHalfRate: secondRate, delta, direction };
}

/** 教训闭环：失败教训若在后续出现同 tag 的成功决策，则记一次闭环 */
function buildLessonImprovement(
  items: Array<{ outcome: GrowthOutcome; tag: string; lesson: string }>,
): LessonImprovement {
  let lessonsRecorded = 0;
  let failureLessons = 0;
  let closedLoops = 0;

  for (let i = 0; i < items.length; i++) {
    const cur = items[i];
    if (!cur.lesson) continue;
    lessonsRecorded += 1;
    if (cur.outcome !== 'failure') continue;
    failureLessons += 1;
    // 后续是否出现同 tag 的成功决策（tag 为空则无法闭环）
    if (!cur.tag) continue;
    const closed = items
      .slice(i + 1)
      .some((later) => later.outcome === 'success' && later.tag === cur.tag);
    if (closed) closedLoops += 1;
  }

  return {
    lessonsRecorded,
    failureLessons,
    closedLoops,
    improvementRate: failureLessons > 0 ? roundRate(closedLoops / failureLessons) : 0,
  };
}

/** 专长标签：按出现频次降序、次键字典序，限量 MAX_EXPERTISE_TAGS */
function buildExpertiseTags(items: Array<{ tag: string }>): ExpertiseTag[] {
  const freq = new Map<string, number>();
  for (const it of items) {
    if (!it.tag) continue;
    freq.set(it.tag, (freq.get(it.tag) ?? 0) + 1);
  }
  return [...freq.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag, 'zh-Hans-CN'))
    .slice(0, MAX_EXPERTISE_TAGS);
}

/** 成长里程碑：首决策 / 首成功 / 首教训 / 标签专精 / 累计决策步长 */
function buildMilestones(
  items: Array<{ atText: string; outcome: GrowthOutcome; tag: string; lesson: string }>,
): GrowthMilestone[] {
  const out: GrowthMilestone[] = [];
  if (items.length === 0) return out;

  // 首次决策（时间最早）
  out.push({
    at: items[0].atText,
    type: 'first_decision',
    title: '首次临床决策复盘',
    description: '正式把一次真实诊疗场景沉淀为个人决策记忆，成长档案开启',
  });

  // 首次成功
  const firstSuccess = items.find((i) => i.outcome === 'success');
  if (firstSuccess) {
    out.push({
      at: firstSuccess.atText,
      type: 'first_success',
      title: '首次成功决策',
      description: '一次被验证有效的临床决策，值得反复复用',
    });
  }

  // 首次沉淀教训
  const firstLesson = items.find((i) => i.lesson);
  if (firstLesson) {
    out.push({
      at: firstLesson.atText,
      type: 'first_lesson',
      title: '首次沉淀教训',
      description: '对一次不完美的决策做了书面复盘，形成可召回的经验',
    });
  }

  // 标签专精：某 tag 第 TAG_MASTERY_COUNT 次出现的那一刻
  const seen = new Map<string, number>();
  for (const it of items) {
    if (!it.tag) continue;
    const n = (seen.get(it.tag) ?? 0) + 1;
    seen.set(it.tag, n);
    if (n === TAG_MASTERY_COUNT) {
      out.push({
        at: it.atText,
        type: 'tag_mastery',
        title: `专精标签达成：${it.tag}`,
        description: `围绕「${it.tag}」累计复盘 ${TAG_MASTERY_COUNT} 次，形成可迁移的专项经验`,
      });
    }
  }

  // 累计决策里程碑：每满 DECISION_STEP 例记一条
  for (let n = DECISION_STEP; n <= items.length; n += DECISION_STEP) {
    out.push({
      at: items[n - 1].atText,
      type: 'decision_count',
      title: `决策复盘累计 ${n} 例`,
      description: `个人决策记忆库突破 ${n} 例，趋势与雷达样本更具代表性`,
    });
  }

  // 按时间升序返回（时间串可比较时）
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/* ------------------------------------------------------------------ */
/* 雷达                                                                 */
/* ------------------------------------------------------------------ */

/**
 * computeRadarScores：从成长档案推四维能力雷达分（0~100 整数）。
 *
 * 口径：
 *  - 用 expertiseTags 的文本 + 频次做加权关键词命中，分别归入诊断 / 用药 / 沟通 / 管理；
 *  - 四个维度中命中最大值归一到 100，其余按比例折算；
 *  - 无任何维度信号时（专家标签为空），用成功率趋势的第二象限成功率给一个中性基线，
 *    避免雷达全 0 误导。
 *
 * 纯函数：不修改入参 profile。
 */
export function computeRadarScores(profile: DoctorGrowthProfile): RadarScores {
  const scores: RadarScores = { diagnosis: 0, medication: 0, communication: 0, management: 0 };
  const weights = { diagnosis: 0, medication: 0, communication: 0, management: 0 };

  for (const et of profile.expertiseTags) {
    for (const { dim, words } of RADAR_KEYWORDS) {
      if (words.some((w) => et.tag.includes(w))) {
        weights[dim] += et.count;
      }
    }
  }

  const maxW = Math.max(weights.diagnosis, weights.medication, weights.communication, weights.management);
  if (maxW <= 0) {
    // 无维度信号：以近期成功率给中性基线（20~80 区间）
    const base = Math.round(20 + 60 * (profile.successTrend?.secondHalfRate ?? 0));
    return { diagnosis: base, medication: base, communication: base, management: base };
  }

  scores.diagnosis = Math.round((weights.diagnosis / maxW) * 100);
  scores.medication = Math.round((weights.medication / maxW) * 100);
  scores.communication = Math.round((weights.communication / maxW) * 100);
  scores.management = Math.round((weights.management / maxW) * 100);
  return scores;
}

/* ================================================================== */
/* M134-B 医生成长档案（doctor_growth_record 周期快照表驱动）            */
/* ------------------------------------------------------------------ */
/* 【用户体验深化】让医生看到自己的进步、有成就感：                     */
/*   以月度快照表 medmuse.doctor_growth_record 为输入，聚合出           */
/*   累计病例 / 平均诊断准确率 / 经验沉淀条数 / 技能标签变化趋势 /      */
/*   同科室横向对比。与上方 M119-A（决策级记忆）互补：本入口面向         */
/*   轻量月度快照，前端成长曲线 + 雷达直接消费。                        */
/* ================================================================== */

/** M134-B：一条 doctor_growth_record 月度快照（路由层从库表塑形后传入） */
export interface DoctorGrowthRecordRow {
  /** 'YYYY-MM' UTC */
  period?: unknown;
  casesHandled?: unknown;
  /** 0~100 百分制 */
  avgScore?: unknown;
  experienceCount?: unknown;
  /** 当期激活技能标签 */
  skills?: unknown;
}

/** 月度趋势一个点（前端成长曲线直接消费） */
export interface MonthlyGrowthSnapshot {
  period: string;
  casesHandled: number;
  avgScore: number;
  experienceCount: number;
  skills: string[];
}

/** 单个技能标签的演化轨迹 */
export interface SkillEvolutionItem {
  skill: string;
  /** 首次出现月份 YYYY-MM */
  firstPeriod: string;
  /** 最近一次出现月份 YYYY-MM */
  lastPeriod: string;
  /** 共在多少个月出现 */
  periodsActive: number;
  /** 近半段月份是否比前半段出现更多：growing / stable / fading */
  trend: 'growing' | 'stable' | 'fading';
}

/** 同科室对比中的单人聚合（self 或 peer） */
export interface PeerStat {
  doctorId: string;
  casesHandled: number;
  /** 0~100 百分制 */
  avgScore: number;
  experienceCount: number;
}

/** 同科室对比结果 */
export interface PeerComparison {
  self: PeerStat;
  /** 同科室（含本人）平均 */
  deptAverage: Omit<PeerStat, 'doctorId'>;
  /** 按 avgScore 降序的 1-based 排名 */
  rank: number;
  /** 同科室总人数（含本人） */
  rankTotal: number;
  /** 本人准确率超过同科室百分之多少的人（0~100 整数） */
  percentile: number;
}

/** buildDoctorGrowthRecordProfile 的返回 */
export interface DoctorGrowthRecordProfile {
  doctorId: string;
  /** 累计处理病例数 */
  cumulativeCases: number;
  /** 加权平均诊断准确率（0~100，2 位小数） */
  overallAccuracy: number;
  /** 累计经验沉淀条数 */
  totalExperience: number;
  /** 月度趋势（按 period 升序） */
  monthlyTrend: MonthlyGrowthSnapshot[];
  /** 技能标签演化 */
  skillsEvolution: SkillEvolutionItem[];
  /** 同科室对比 */
  peerComparison: PeerComparison;
  /** 四维能力雷达（由技能标签关键词命中推出） */
  radar: RadarScores;
}

/** 宽松收敛为非负整数 */
function toNonNegInt(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** 宽松收敛为 0~100 百分制分数 */
function toScore(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

/** 宽松收敛为字符串数组（技能标签） */
function toSkillList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const s = toText(item);
    if (s) out.push(s);
  }
  return out;
}

/** round2：百分制分数保留 2 位小数 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * buildDoctorGrowthRecordProfile：从医生月度成长快照构建成长档案。
 *
 * 纯函数：不打库、不写全局、不抛错；入参 null / undefined / 脏值一律兜底。
 *
 * @param doctorId 医生工号（仅透传，不参与计算）
 * @param records  该医生的月度快照数组（null/undefined 按空集处理）
 * @param peers    同科室其他医生的聚合统计（用于横向对比；null/undefined 按空集）
 */
export function buildDoctorGrowthRecordProfile(
  doctorId: string,
  records: DoctorGrowthRecordRow[] | null | undefined,
  peers: PeerStat[] | null | undefined,
): DoctorGrowthRecordProfile {
  // 1) 塑形月度快照，按 period 升序
  const raw = Array.isArray(records) ? records : [];
  const monthlyTrend: MonthlyGrowthSnapshot[] = raw
    .map((r) => ({
      period: toText(r?.period),
      casesHandled: toNonNegInt(r?.casesHandled),
      avgScore: toScore(r?.avgScore),
      experienceCount: toNonNegInt(r?.experienceCount),
      skills: toSkillList(r?.skills),
    }))
    .filter((r) => /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(r.period))
    .sort((a, b) => a.period.localeCompare(b.period));

  // 2) 累计指标：病例数 / 经验条数直接求和；准确率按病例数加权
  let cumulativeCases = 0;
  let totalExperience = 0;
  let weightedScoreSum = 0;
  for (const m of monthlyTrend) {
    cumulativeCases += m.casesHandled;
    totalExperience += m.experienceCount;
    weightedScoreSum += m.avgScore * m.casesHandled;
  }
  const overallAccuracy = cumulativeCases > 0 ? round2(weightedScoreSum / cumulativeCases) : 0;

  // 3) 技能标签演化：聚合每个技能出现的月份集合，判定趋势
  const skillsEvolution = buildSkillsEvolution(monthlyTrend);

  // 4) 同科室对比
  const peerComparison = buildPeerComparison(doctorId, monthlyTrend, peers);

  // 5) 雷达：由全部技能标签关键词命中推出
  const allSkills = monthlyTrend.flatMap((m) => m.skills);
  const radar = computeRadarFromSkills(allSkills, overallAccuracy);

  return {
    doctorId,
    cumulativeCases,
    overallAccuracy,
    totalExperience,
    monthlyTrend,
    skillsEvolution,
    peerComparison,
    radar,
  };
}

/** 技能演化：按首次出现排序，趋势按前/后半段出现月份数比较 */
function buildSkillsEvolution(monthly: MonthlyGrowthSnapshot[]): SkillEvolutionItem[] {
  const periodsBySkill = new Map<string, string[]>();
  for (const m of monthly) {
    for (const s of m.skills) {
      const arr = periodsBySkill.get(s) ?? [];
      arr.push(m.period);
      periodsBySkill.set(s, arr);
    }
  }

  const out: SkillEvolutionItem[] = [];
  for (const [skill, periods] of periodsBySkill.entries()) {
    const sorted = [...periods].sort();
    const mid = Math.ceil(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid).length;
    const secondHalf = sorted.slice(mid).length;
    let trend: SkillEvolutionItem['trend'] = 'stable';
    if (secondHalf > firstHalf) trend = 'growing';
    else if (secondHalf < firstHalf) trend = 'fading';
    out.push({
      skill,
      firstPeriod: sorted[0],
      lastPeriod: sorted[sorted.length - 1],
      periodsActive: sorted.length,
      trend,
    });
  }

  // 首次出现月份升序（早出现的排前），次键标签字典序
  return out.sort(
    (a, b) => a.firstPeriod.localeCompare(b.firstPeriod) || a.skill.localeCompare(b.skill, 'zh-Hans-CN'),
  );
}

/** 同科室对比：self 由月度快照汇总，peers 由路由层聚合后传入 */
function buildPeerComparison(
  doctorId: string,
  monthly: MonthlyGrowthSnapshot[],
  peers: PeerStat[] | null | undefined,
): PeerComparison {
  let casesHandled = 0;
  let experienceCount = 0;
  let weightedScoreSum = 0;
  for (const m of monthly) {
    casesHandled += m.casesHandled;
    experienceCount += m.experienceCount;
    weightedScoreSum += m.avgScore * m.casesHandled;
  }
  const self: PeerStat = {
    doctorId,
    casesHandled,
    avgScore: casesHandled > 0 ? round2(weightedScoreSum / casesHandled) : 0,
    experienceCount,
  };

  const peerList = Array.isArray(peers) ? peers.filter((p) => p && toText(p.doctorId) && p.doctorId !== doctorId) : [];

  // deptAverage = (self + peers) 的平均
  const all = [self, ...peerList];
  const n = all.length;
  const deptAverage = {
    casesHandled: Math.round(all.reduce((s, p) => s + p.casesHandled, 0) / n),
    avgScore: round2(all.reduce((s, p) => s + p.avgScore, 0) / n),
    experienceCount: Math.round(all.reduce((s, p) => s + p.experienceCount, 0) / n),
  };

  // 按 avgScore 降序排名（同分按 casesHandled 降序）
  const ranked = [...all].sort((a, b) => b.avgScore - a.avgScore || b.casesHandled - a.casesHandled);
  const rank = ranked.findIndex((p) => p.doctorId === doctorId) + 1;

  // percentile：同科室中准确率低于本人的人数占比（0~100 整数）
  const below = peerList.filter((p) => p.avgScore < self.avgScore).length;
  const percentile = peerList.length > 0 ? Math.round((below / peerList.length) * 100) : 0;

  return { self, deptAverage, rank: rank > 0 ? rank : n, rankTotal: n, percentile };
}

/**
 * computeRadarFromSkills：由技能标签文本推四维雷达分（0~100 整数）。
 * 与 M119-A computeRadarScores 共用关键词词典；无信号时用整体准确率给中性基线。
 */
export function computeRadarFromSkills(skills: string[], overallAccuracy: number): RadarScores {
  const weights = { diagnosis: 0, medication: 0, communication: 0, management: 0 };
  for (const s of skills) {
    for (const { dim, words } of RADAR_KEYWORDS) {
      if (words.some((w) => s.includes(w))) weights[dim] += 1;
    }
  }
  const maxW = Math.max(weights.diagnosis, weights.medication, weights.communication, weights.management);
  if (maxW <= 0) {
    // 无维度信号：以整体准确率映射到 20~80 中性区间
    const base = Math.round(20 + 60 * Math.min(1, Math.max(0, overallAccuracy / 100)));
    return { diagnosis: base, medication: base, communication: base, management: base };
  }
  return {
    diagnosis: Math.round((weights.diagnosis / maxW) * 100),
    medication: Math.round((weights.medication / maxW) * 100),
    communication: Math.round((weights.communication / maxW) * 100),
    management: Math.round((weights.management / maxW) * 100),
  };
}
