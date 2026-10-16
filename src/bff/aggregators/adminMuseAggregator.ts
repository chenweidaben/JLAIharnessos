/**
 * 健澜科技 jlmedaios - 管理员 MUSE 决策经验聚合器（M116-C）
 *
 * 依据宪法第七章 7.6（管理员 MUSE：院长 / 职能科室主任的决策经验沉淀）：
 *   从管理员本人的历史决策记忆（medmuse.admin_decision_memory）中聚合
 *   「越用越懂这位管理员」的决策经验视图——总决策数、平均量化改善
 *   （avgMetricImprovement）、决策 ROI 排行（roiRanking）与管理经验
 *   时间线（decisionTimeline）。
 *
 * 设计要点：
 *  - buildAdminMuse / computeROI 为纯函数：不打库、不读环境、不修改入参；
 *    便于单测与前端侧本地复用；
 *  - outcomes 为「事后实测效果观察」列表（路由层可由独立效果评估表注入），
 *    按 decisionId 覆盖决策自带的 resultMetric；缺省时回落到决策自身的
 *    result_metric，二者皆缺则按 0 处理；
 *  - ROI 按结局加权：success = +metric，mixed = +metric*0.5，failure = -metric；
 *    保留 2 位小数，输出确定可快照；
 *  - 任一入参为 null / undefined / 空数组时返回零值兜底视图，绝不抛错；
 *  - 聚合只使用脱敏后的管理决策摘要，不落患者直接标识符。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 管理决策结局三态（与 medmuse.admin_decision_memory.outcome CHECK 一致） */
export type AdminDecisionOutcome = 'success' | 'failure' | 'mixed';

/**
 * 一条管理决策记忆（对应 medmuse.admin_decision_memory 一行；
 * context 已在入库前脱敏，纯函数侧只读取结构化字段）。
 */
export interface AdminDecision {
  /** 决策主键（uuid） */
  id: string;
  /** 管理员脱敏工号 */
  adminId: string;
  /** 决策类别：预算 / 人事 / 流程 / 采购 / 绩效 … */
  decisionType: string;
  /** 决策上下文摘要（脱敏文本） */
  context: string;
  /** 实际采取的管理动作 */
  action: string;
  /** 事后量化效果（正=改善，负=恶化；可空=未量化） */
  resultMetric: number | null;
  /** 结局：成功 / 失败 / 混合 */
  outcome: AdminDecisionOutcome;
  /** 决策发生时间（ISO 8601） */
  createdAt: string;
}

/**
 * 事后实测效果观察（独立效果评估侧注入；按 decisionId 覆盖决策自带
 * 的 result_metric，使 ROI 与平均改善口径以「实测」为准）。
 */
export interface AdminOutcomeObservation {
  /** 被评估的决策 id（对应 AdminDecision.id） */
  decisionId: string;
  /** 实测改善值（与 result_metric 同量纲） */
  measuredImprovement: number;
}

/** ROI 排行单条 */
export interface AdminRoiRankItem {
  /** 决策 id */
  id: string;
  /** 决策类别 */
  decisionType: string;
  /** 管理动作摘要 */
  action: string;
  /** 结局（前端按结局着色） */
  outcome: AdminDecisionOutcome;
  /** 生效量化改善值（实测覆盖后；未量化为 0） */
  resultMetric: number;
  /** 本条决策 ROI（2 位小数） */
  roi: number;
}

/** 管理经验时间线单条 */
export interface AdminTimelineItem {
  /** yyyy-MM-dd */
  date: string;
  /** 决策类别 */
  decisionType: string;
  /** 管理动作摘要 */
  action: string;
  /** 结局（前端按结局着色） */
  outcome: AdminDecisionOutcome;
  /** 生效量化改善值（未量化为 0） */
  resultMetric: number;
  /** 本条决策 ROI（2 位小数） */
  roi: number;
}

/** 管理员 MUSE 视图（与前端 web/src/pages/muse/Admin 对齐） */
export interface AdminMuseView {
  /** 累计管理决策数 */
  totalDecisions: number;
  /** 平均量化改善（有度量决策的 resultMetric 均值，2 位小数；无度量为 0） */
  avgMetricImprovement: number;
  /** 决策 ROI 排行（ROI 降序，截断 10 条） */
  roiRanking: AdminRoiRankItem[];
  /** 管理经验时间线（决策时间倒序，截断 10 条） */
  decisionTimeline: AdminTimelineItem[];
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** ROI 排行最多展示条数 */
export const ADMIN_ROI_RANK_LIMIT = 10;

/** 管理经验时间线最多展示条数 */
export const ADMIN_TIMELINE_LIMIT = 10;

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/** round2：四舍五入到 2 位小数，避免浮点噪声导致快照不稳定 */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 两位补零 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Date → yyyy-MM-dd */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 安全解析时间；非法输入返回 null */
function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** 结局归一：非三态值一律归为 mixed（防御脏数据，不抛错） */
function normalizeOutcome(v: unknown): AdminDecisionOutcome {
  if (v === 'success' || v === 'failure' || v === 'mixed') return v;
  return 'mixed';
}

/** 数值归一：非有限数一律归为 null（未量化） */
function toMetric(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/* ------------------------------------------------------------------ */
/* ROI 计算（纯函数）                                                   */
/* ------------------------------------------------------------------ */

/**
 * computeROI：按管理决策的结局与量化改善值计算 ROI。
 *
 * 口径：
 *  - success：正收益，ROI = +resultMetric；
 *  - mixed  ：部分收益，ROI = +resultMetric * 0.5；
 *  - failure：负收益（决策未达预期 / 实际恶化），ROI = -resultMetric；
 *  - resultMetric 为 null / 非有限数时按 0 处理，ROI = 0。
 *
 * 纯函数：不修改入参，不读环境；返回 2 位小数。
 *
 * @param decision 只需 { resultMetric, outcome } 形状
 */
export function computeROI(decision: {
  resultMetric: number | null;
  outcome: AdminDecisionOutcome;
}): number {
  const m = toMetric(decision.resultMetric);
  if (m === null) return 0;
  if (decision.outcome === 'success') return round2(m);
  if (decision.outcome === 'mixed') return round2(m * 0.5);
  // failure
  return round2(-m);
}

/* ------------------------------------------------------------------ */
/* 纯函数主入口                                                        */
/* ------------------------------------------------------------------ */

/**
 * buildAdminMuse：从管理员历史决策记忆 + 事后实测效果观察构建个人决策经验视图。
 *
 * 聚合口径：
 *  - effectiveMetric 逐条解析：outcomes 中按 decisionId 命中的 measuredImprovement
 *    优先；否则取决策自带 resultMetric；二者皆缺为 null（未量化）；
 *  - totalDecisions    清洗后决策条数；
 *  - avgMetricImprovement 有度量（effectiveMetric 非 null）决策的均值，2 位小数；
 *                        无任何度量决策时为 0；
 *  - roiRanking        逐条用 computeROI(effectiveMetric + outcome) 计算 ROI，
 *                      按 ROI 降序（并列按时间倒序、再按 id 升序，保证可快照），
 *                      截断 10 条；
 *  - decisionTimeline  按 createdAt 倒序（无时间排最后）映射 {date, decisionType,
 *                      action, outcome, resultMetric, roi}，截断 10 条。
 *
 * 纯函数：不修改入参；任一入参为 null / undefined / 空数组时返回零值兜底视图，
 *   不抛错。staffId 仅作冷启动上下文保留（聚合指标不依赖该字段）。
 *
 * @param staffId   管理员脱敏工号
 * @param decisions 管理决策记忆行（可空）
 * @param outcomes  事后实测效果观察（可空；按 decisionId 覆盖 result_metric）
 */
export function buildAdminMuse(
  staffId: string,
  decisions: AdminDecision[] | null | undefined,
  outcomes: AdminOutcomeObservation[] | null | undefined,
): AdminMuseView {
  // staffId 仅作冷启动兜底上下文保留（无历史决策时同样输出零值视图）
  void staffId;

  const clean = (decisions ?? []).filter(
    (d): d is AdminDecision => Boolean(d) && typeof d.id === 'string',
  );

  // outcomes 索引：decisionId → measuredImprovement（仅保留有限数）
  const measured = new Map<string, number>();
  for (const o of outcomes ?? []) {
    if (!o || typeof o.decisionId !== 'string') continue;
    const v = toMetric(o.measuredImprovement);
    if (v !== null) measured.set(o.decisionId, v);
  }

  // 逐条清洗 + 解析生效度量
  const rows = clean.map((d, idx) => {
    const own = toMetric(d.resultMetric);
    const effective = measured.has(d.id) ? (measured.get(d.id) as number) : own;
    const outcome = normalizeOutcome(d.outcome);
    const metric = effective ?? 0;
    return {
      id: d.id,
      decisionType: (d.decisionType ?? '').trim() || '未分类',
      action: (d.action ?? '').trim(),
      outcome,
      metric,
      hasMetric: effective !== null,
      time: parseTime(d.createdAt),
      idx,
    };
  });

  // 总决策数
  const totalDecisions = rows.length;

  // 平均量化改善：仅统计有度量的决策
  const measuredRows = rows.filter((r) => r.hasMetric);
  const avgMetricImprovement =
    measuredRows.length > 0
      ? round2(
          measuredRows.reduce((sum, r) => sum + r.metric, 0) / measuredRows.length,
        )
      : 0;

  // ROI 排行：ROI 降序（并列：时间倒序 → id 升序），截断 10 条
  const roiRanking: AdminRoiRankItem[] = rows
    .map((r) => ({
      id: r.id,
      decisionType: r.decisionType,
      action: r.action,
      outcome: r.outcome,
      resultMetric: r.metric,
      roi: computeROI({ resultMetric: r.metric, outcome: r.outcome }),
      time: r.time,
      idx: r.idx,
    }))
    .sort((a, b) => {
      if (b.roi !== a.roi) return b.roi - a.roi;
      const at = a.time ?? Number.NEGATIVE_INFINITY;
      const bt = b.time ?? Number.NEGATIVE_INFINITY;
      if (bt !== at) return bt - at;
      return a.id.localeCompare(b.id);
    })
    .slice(0, ADMIN_ROI_RANK_LIMIT)
    .map(({ time: _t, idx: _i, ...rest }) => rest);

  // 管理经验时间线：时间倒序（无时间排最后），截断 10 条
  const decisionTimeline: AdminTimelineItem[] = rows
    .map((r) => ({ row: r, idx: r.idx }))
    .sort((a, b) => {
      const at = a.row.time ?? Number.NEGATIVE_INFINITY;
      const bt = b.row.time ?? Number.NEGATIVE_INFINITY;
      if (bt !== at) return bt - at;
      return a.idx - b.idx;
    })
    .slice(0, ADMIN_TIMELINE_LIMIT)
    .map(({ row }) => ({
      date: row.time !== null ? dateKey(new Date(row.time)) : '未知日期',
      decisionType: row.decisionType,
      action: row.action,
      outcome: row.outcome,
      resultMetric: row.metric,
      roi: computeROI({ resultMetric: row.metric, outcome: row.outcome }),
    }));

  return {
    totalDecisions,
    avgMetricImprovement,
    roiRanking,
    decisionTimeline,
  };
}

/* ================================================================== */
/* ================= M169-D 知识图谱与 Personal Agent ================ */
/* ================================================================== */
/*
 * 管理员个人管理智能体（Personal Agent）——让「越用越懂这位管理员」落到实处：
 *   把每一次管理动作按四类沉淀进个人经验图谱（运营决策 / 管理经验 /
 *   资源调配 / 危机处理），再据此：
 *     1. buildAdminMUSEProfile        —— 画出「管理画像」：擅长什么、盲区在哪、
 *                                        哪些打法成过、哪些跟头栽过；
 *     2. recommendAdminDecision       —— 新情境下召回本人同类战例，给出
 *                                        「什么动作在你身上成过 / 什么动作栽过」
 *                                        的具体推荐，而不是空泛的「建议关注」；
 *     3. benchmarkAdminDecision       —— 事后用本人历史基线给决策做对标，
 *                                        输出可执行的复盘结论。
 *
 * 本切片无新表、不写 SQL：经验沉淀保存在进程内个人经验图谱（模块级 Map）。
 *   buildAdminMUSEProfile / recommendAdminDecision / benchmarkAdminDecision
 *   为只读纯函数（不修改图谱、不读环境、不抛错）；recordAdminExperience 是
 *   唯一写入点，负责校验归一后落图。单测用 __resetAdminExperienceStore 隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 四类管理沉淀（与任务要求一一对应） */
export type AdminExperienceCategory =
  | 'operations_decision' // 运营决策沉淀：决策 / 结果 / 反思
  | 'management' // 管理经验沉淀：流程优化 / 团队管理 / 问题解决
  | 'resource_allocation' // 资源调配沉淀：调配方案 / 效果 / 改进
  | 'crisis'; // 危机处理沉淀：事件 / 应对 / 教训

/** 合法类别集合（防御脏数据用） */
export const ADMIN_EXPERIENCE_CATEGORIES: readonly AdminExperienceCategory[] = [
  'operations_decision',
  'management',
  'resource_allocation',
  'crisis',
];

/** 类别中文标签（前端与复盘文案共用） */
export const ADMIN_CATEGORY_LABEL: Record<AdminExperienceCategory, string> = {
  operations_decision: '运营决策',
  management: '管理经验',
  resource_allocation: '资源调配',
  crisis: '危机处理',
};

/** 效果量纲区间：+2 显著改善 … -2 明显恶化 */
export const EFFECT_MIN = -2;
export const EFFECT_MAX = 2;

/**
 * 前端 / 路由提交的原始经验记录（字段全部按 unknown 接收，纯函数侧逐一收敛）。
 *  - category     四类之一（见 AdminExperienceCategory）
 *  - subType      子类：流程优化 / 团队管理 / 问题解决 / 预算调配 / 人力调配 / 舆情…
 *  - situation    背景：遇到的问题 / 事件 / 决策情境（脱敏文本）
 *  - action       采取的方案 / 应对动作 / 调配方案
 *  - outcome      success / mixed / failure
 *  - effectiveness 事后效果，[-2,+2]（可空=未量化，落 0）
 *  - reflection   反思 / 教训 / 改进点
 *  - tags         关联标签：逗号顿号分隔字符串 或 字符串数组
 */
export interface AdminExperienceInput {
  category?: unknown;
  subType?: unknown;
  situation?: unknown;
  action?: unknown;
  outcome?: unknown;
  effectiveness?: unknown;
  reflection?: unknown;
  tags?: unknown;
}

/** 落图后的一条经验记录 */
export interface AdminExperienceRecord {
  /** 经验主键（进程内自增） */
  id: string;
  /** 管理员脱敏工号 */
  staffId: string;
  /** 沉淀类别 */
  category: AdminExperienceCategory;
  /** 子类（空则按类别给默认子类） */
  subType: string;
  /** 背景 / 问题 / 事件（脱敏） */
  situation: string;
  /** 采取的方案 / 动作 */
  action: string;
  /** 结局三态 */
  outcome: AdminDecisionOutcome;
  /** 事后效果 [-2,+2] */
  effectiveness: number;
  /** 反思 / 教训 / 改进 */
  reflection: string;
  /** 标签（去重保序） */
  tags: string[];
  /** 沉淀时间 ISO 8601 */
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* 个人经验图谱（进程内存储，本切片无新表）                              */
/* ------------------------------------------------------------------ */

/** staffId → 该管理员的经验记录列表（按落图顺序追加） */
const adminExperienceStore = new Map<string, AdminExperienceRecord[]>();

/** 经验主键自增序号（保证 id 确定可快照） */
let adminExpSeq = 0;

/** 测试隔离：清空个人经验图谱并复位序号 */
export function __resetAdminExperienceStore(): void {
  adminExperienceStore.clear();
  adminExpSeq = 0;
}

/** 读取某管理员全部经验（只读；不存在返回空数组） */
function readExperiences(staffId: string): AdminExperienceRecord[] {
  const sid = (staffId ?? '').trim();
  return sid ? adminExperienceStore.get(sid) ?? [] : [];
}

/* ------------------------------------------------------------------ */
/* 归一工具（纯，不抛错）                                               */
/* ------------------------------------------------------------------ */

/** 类别归一：非四类一律归为 management（最常见的管理经验） */
function normalizeCategory(v: unknown): AdminExperienceCategory {
  if (typeof v === 'string') {
    const t = v.trim();
    if ((ADMIN_EXPERIENCE_CATEGORIES as readonly string[]).includes(t)) {
      return t as AdminExperienceCategory;
    }
  }
  return 'management';
}

/** 安全字符串：非字符串 / 仅空白 → 空串 */
function toStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 效果值归一：非有限数 → 0；否则截断到 [-2,+2]，保留 2 位小数 */
function toEffectiveness(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  const c = Math.min(EFFECT_MAX, Math.max(EFFECT_MIN, v));
  return Math.round(c * 100) / 100;
}

/** 标签清洗：字符串（中英分隔符）或数组；trim → 去空 → 去重保序 → 上限 12 */
function toTags(v: unknown): string[] {
  const parts: string[] = [];
  if (Array.isArray(v)) {
    for (const item of v) if (typeof item === 'string') parts.push(item);
  } else if (typeof v === 'string') {
    parts.push(...v.split(/[,，、;；\s]+/));
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = p.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
      if (out.length >= 12) break;
    }
  }
  return out;
}

/** 各类别的默认子类（子类缺失时兜底） */
function defaultSubType(cat: AdminExperienceCategory): string {
  switch (cat) {
    case 'operations_decision':
      return '运营决策';
    case 'resource_allocation':
      return '资源调配';
    case 'crisis':
      return '危机处置';
    default:
      return '综合管理';
  }
}

/* ------------------------------------------------------------------ */
/* 1) recordAdminExperience —— 管理经验记录（唯一写入点）              */
/* ------------------------------------------------------------------ */

/**
 * recordAdminExperience：把一次真实管理动作沉淀进该管理员的个人经验图谱。
 *
 * 归一规则：category 缺省/非法 → management；outcome 非三态 → mixed；
 *   effectiveness 非数 → 0 并截断到 [-2,+2]；tags 兼容字符串/数组。
 * 落图后返回完整记录（含分配的 id 与落图时间），不修改入参。
 *
 * @param staffId 管理员脱敏工号
 * @param input   原始经验记录（字段宽松）
 */
export function recordAdminExperience(
  staffId: string,
  input: AdminExperienceInput | null | undefined,
): AdminExperienceRecord {
  const sid = toStr(staffId) || 'unknown';
  const src = input ?? {};
  const category = normalizeCategory(src.category);
  const record: AdminExperienceRecord = {
    id: `admin-exp-${++adminExpSeq}`,
    staffId: sid,
    category,
    subType: toStr(src.subType) || defaultSubType(category),
    situation: toStr(src.situation),
    action: toStr(src.action),
    outcome: normalizeOutcome(src.outcome),
    effectiveness: toEffectiveness(src.effectiveness),
    reflection: toStr(src.reflection),
    tags: toTags(src.tags),
    createdAt: new Date().toISOString(),
  };

  const list = adminExperienceStore.get(sid);
  if (list) list.push(record);
  else adminExperienceStore.set(sid, [record]);
  return record;
}

/* ------------------------------------------------------------------ */
/* 画像 / 推荐 / 对标 共用统计                                          */
/* ------------------------------------------------------------------ */

/** 一个类别的累计统计 */
interface CategoryStat {
  category: AdminExperienceCategory;
  count: number;
  effectSum: number;
  successCount: number;
}

/** 按四类聚合计数与均值（只读，不修改图谱） */
function tallyByCategory(
  list: AdminExperienceRecord[],
): Record<AdminExperienceCategory, CategoryStat> {
  const blank = (): CategoryStat => ({ category: 'management', count: 0, effectSum: 0, successCount: 0 });
  const stat: Record<AdminExperienceCategory, CategoryStat> = {
    operations_decision: blank(),
    management: blank(),
    resource_allocation: blank(),
    crisis: blank(),
  };
  stat.operations_decision.category = 'operations_decision';
  stat.resource_allocation.category = 'resource_allocation';
  stat.crisis.category = 'crisis';
  for (const r of list) {
    const s = stat[r.category];
    s.count += 1;
    s.effectSum += r.effectiveness;
    if (r.outcome === 'success') s.successCount += 1;
  }
  return stat;
}

/** 类别均值（2 位小数；无样本为 0） */
function avgEff(s: CategoryStat): number {
  return s.count > 0 ? Math.round((s.effectSum / s.count) * 100) / 100 : 0;
}

/** 全部经验的平均效果（2 位小数；无样本为 0） */
function overallAvg(list: AdminExperienceRecord[]): number {
  if (list.length === 0) return 0;
  const sum = list.reduce((acc, r) => acc + r.effectiveness, 0);
  return Math.round((sum / list.length) * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* 2) buildAdminMUSEProfile —— 管理员个人智能体画像                   */
/* ------------------------------------------------------------------ */

/** 画像中一个类别的统计 */
export interface AdminCategoryProfile {
  category: AdminExperienceCategory;
  label: string;
  count: number;
  avgEffectiveness: number;
  /** 成功率 0..1（success 占比，2 位小数） */
  successRate: number;
}

/** 一条可复用打法 / 一条栽过的跟头 */
export interface AdminProfileLesson {
  id: string;
  category: string;
  subType: string;
  /** 成过的动作 / 失败的动作 */
  action: string;
  /** 反思或教训 */
  reflection: string;
  effectiveness: number;
}

/** 一个待补强盲区 */
export interface AdminProfileGap {
  category: AdminExperienceCategory;
  label: string;
  /** 具体原因（数据说话，不空喊） */
  reason: string;
}

/** 管理员 MUSE 个人智能体画像 */
export interface AdminMUSEProfile {
  staffId: string;
  /** 已沉淀经验总数 */
  totalExperiences: number;
  /** 成长分 0..100（沉淀量 + 平均效果 + 反思完整度合成） */
  growthScore: number;
  /** 四类沉淀分布 */
  byCategory: AdminCategoryProfile[];
  /** 擅长领域：验证过的可复用打法 */
  strengths: AdminProfileLesson[];
  /** 待补强盲区 */
  gaps: AdminProfileGap[];
  /** 栽过的跟头（失败教训，避免重蹈） */
  pitfalls: AdminProfileLesson[];
  /** 危机处置稳健度 0..1（危机类 success 占比；无危机经验为 0） */
  crisisSteadiness: number;
  /** 冷启动：尚无任何沉淀 */
  isColdStart: boolean;
}

/**
 * buildAdminMUSEProfile：从该管理员的个人经验图谱画出管理画像。
 *
 * 口径：
 *  - growthScore  沉淀量(0~40) + 平均效果映射(0~40) + 反思完整度(0~20)；
 *  - strengths    effectiveness≥+1 的记录按效果降序、时间倒序取前 5，
 *                 即「在你身上真成过的打法」；
 *  - gaps         该类别沉淀 <2 条（经验不足）或平均效果 ≤0（屡试不爽却没成）；
 *  - pitfalls     outcome=failure 的记录按效果升序取前 5，即「栽过的跟头」；
 *  - crisisSteadiness 危机类 success 占比。
 *
 * 只读纯函数：不修改图谱；无沉淀时返回冷启动画像，绝不抛错。
 */
export function buildAdminMUSEProfile(staffId: string): AdminMUSEProfile {
  const list = readExperiences(staffId);
  const sid = toStr(staffId) || 'unknown';
  const stat = tallyByCategory(list);

  const byCategory: AdminCategoryProfile[] = ADMIN_EXPERIENCE_CATEGORIES.map((cat) => {
    const s = stat[cat];
    return {
      category: cat,
      label: ADMIN_CATEGORY_LABEL[cat],
      count: s.count,
      avgEffectiveness: avgEff(s),
      successRate: s.count > 0 ? Math.round((s.successCount / s.count) * 100) / 100 : 0,
    };
  });

  // 成长分合成（冷启动零沉淀直接为 0，不给「中间分」）
  const total = list.length;
  const volScore = Math.min(40, total * 2); // 20 条即满分
  const overall = overallAvg(list); // [-2,2]
  const effScore =
    total > 0 ? Math.max(0, Math.min(4, (overall + 2) / 4)) * 10 : 0; // 0..40
  const reflected = list.filter((r) => r.reflection.length > 0).length;
  const reflScore = total > 0 ? Math.round((reflected / total) * 20) : 0;
  const growthScore = total === 0 ? 0 : Math.round(Math.min(100, volScore + effScore + reflScore));

  // 擅长打法：effectiveness≥+1，效果降序 → 时间倒序
  const strengths: AdminProfileLesson[] = list
    .filter((r) => r.effectiveness >= 1)
    .sort((a, b) =>
      b.effectiveness - a.effectiveness || b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      category: ADMIN_CATEGORY_LABEL[r.category],
      subType: r.subType,
      action: r.action,
      reflection: r.reflection,
      effectiveness: r.effectiveness,
    }));

  // 盲区：经验太少 或 屡试未竟
  const gaps: AdminProfileGap[] = [];
  for (const cat of ADMIN_EXPERIENCE_CATEGORIES) {
    const s = stat[cat];
    const label = ADMIN_CATEGORY_LABEL[cat];
    if (s.count === 0) {
      gaps.push({ category: cat, label, reason: `尚无${label}类沉淀，遇到此类场景缺乏本人战例支撑` });
    } else if (s.count < 2) {
      gaps.push({ category: cat, label, reason: `${label}仅 ${s.count} 条沉淀，样本不足，结论不稳定` });
    } else if (avgEff(s) <= 0) {
      gaps.push({
        category: cat,
        label,
        reason: `${label} ${s.count} 次平均效果 ${avgEff(s).toFixed(2)}，未跑通，需重点复盘打法`,
      });
    }
  }

  // 栽过的跟头：failure，效果升序（最差在前）
  const pitfalls: AdminProfileLesson[] = list
    .filter((r) => r.outcome === 'failure')
    .sort((a, b) =>
      a.effectiveness - b.effectiveness || b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      category: ADMIN_CATEGORY_LABEL[r.category],
      subType: r.subType,
      action: r.action,
      reflection: r.reflection,
      effectiveness: r.effectiveness,
    }));

  const crisis = stat.crisis;
  const crisisSteadiness =
    crisis.count > 0 ? Math.round((crisis.successCount / crisis.count) * 100) / 100 : 0;

  return {
    staffId: sid,
    totalExperiences: total,
    growthScore,
    byCategory,
    strengths,
    gaps,
    pitfalls,
    crisisSteadiness,
    isColdStart: total === 0,
  };
}

/* ------------------------------------------------------------------ */
/* 3) recommendAdminDecision —— 管理决策推荐（召回本人战例）            */
/* ------------------------------------------------------------------ */

/** 新情境上下文（宽松接收） */
export interface AdminDecisionContext {
  category?: unknown;
  subType?: unknown;
  situation?: unknown;
  tags?: unknown;
}

/** 命中的一条历史战例 */
export interface AdminMatchedCase {
  id: string;
  category: string;
  subType: string;
  situation: string;
  action: string;
  outcome: AdminDecisionOutcome;
  effectiveness: number;
  /** 相关度 0+（确定可快照） */
  relevance: number;
}

/** 一条被本人历史验证过的推荐动作 */
export interface AdminRecommendedAction {
  action: string;
  category: string;
  /** 该动作在你身上成过几次（success/mixed） */
  timesWorked: number;
  avgEffectiveness: number;
  /** 证据文案（数据说话） */
  evidence: string;
}

/** 一条要避开的坑 */
export interface AdminPitfall {
  action: string;
  lesson: string;
  category: string;
}

/** 决策推荐结果 */
export interface AdminDecisionRecommendation {
  staffId: string;
  /** 冷启动：无任何沉淀，只能给基线打法 */
  coldStart: boolean;
  matchedCases: AdminMatchedCase[];
  recommendedActions: AdminRecommendedAction[];
  pitfallsToAvoid: AdminPitfall[];
  /** 置信度 0..1（命中数 × 命中质量） */
  confidence: number;
  /** 一句话结论（具体，不说「建议关注」） */
  summary: string;
}

/** 提取中文二元 gram（用于情境相似度，去掉空白与标点） */
function charBigrams(s: string): Set<string> {
  const chars = (s ?? '').replace(/[\s\p{P}\p{S}]/gu, '');
  const out = new Set<string>();
  for (let i = 0; i < chars.length - 1; i += 1) out.add(chars.slice(i, i + 2));
  return out;
}

/**
 * relevance：新情境与一条历史经验的相关度。
 *  类别一致 +2；子类一致 +3 / 互相包含 +1；标签重合每条 +1；
 *  情境二元 gram 重合每组 +0.2（封顶 +2）。确定可快照。
 */
function relevanceScore(
  ctx: { category: AdminExperienceCategory; subType: string; tagSet: Set<string>; grams: Set<string> },
  exp: AdminExperienceRecord,
): number {
  let score = 0;
  if (exp.category === ctx.category) score += 2;
  if (ctx.subType) {
    if (exp.subType === ctx.subType) score += 3;
    else if (exp.subType.includes(ctx.subType) || ctx.subType.includes(exp.subType)) score += 1;
  }
  for (const t of exp.tags) if (ctx.tagSet.has(t)) score += 1;
  const expGrams = charBigrams(exp.situation + ' ' + exp.action);
  let shared = 0;
  for (const g of ctx.grams) if (expGrams.has(g)) shared += 1;
  score += Math.min(2, shared * 0.2);
  return Math.round(score * 100) / 100;
}

/**
 * recommendAdminDecision：给一位管理员的新管理情境，召回其本人历史战例，
 *   输出具体可执行的推荐——成过什么动作、栽过什么跟头，而不是空泛提示。
 *
 * 纯函数（只读图谱）：无任何历史时 coldStart=true，按类别返回基线打法，
 *   confidence=0，绝不抛错。
 *
 * @param staffId 管理员脱敏工号
 * @param context { category, subType, situation, tags }
 */
export function recommendAdminDecision(
  staffId: string,
  context: AdminDecisionContext | null | undefined,
): AdminDecisionRecommendation {
  const sid = toStr(staffId) || 'unknown';
  const src = context ?? {};
  const category = normalizeCategory(src.category);
  const subType = toStr(src.subType);
  const tagSet = new Set(toTags(src.tags));
  const grams = charBigrams(toStr(src.situation));

  const list = readExperiences(sid);

  // 无沉淀：冷启动基线打法（按类别给一句可落地的起步建议）
  if (list.length === 0) {
    const baseline = BASELINE_PLAYBOOK[category];
    return {
      staffId: sid,
      coldStart: true,
      matchedCases: [],
      recommendedActions: [
        {
          action: baseline.action,
          category: ADMIN_CATEGORY_LABEL[category],
          timesWorked: 0,
          avgEffectiveness: 0,
          evidence: '暂无本人战例，以下为该类管理的通用起步打法',
        },
      ],
      pitfallsToAvoid: [],
      confidence: 0,
      summary: `你还没有${ADMIN_CATEGORY_LABEL[category]}类沉淀。起步建议：${baseline.action}。完成一次真实处置后回来沉淀，我会据此给出只属于你的推荐。`,
    };
  }

  // 逐条打分 → 相关度降序（并列：效果绝对值大的优先 → id 升序）
  const scored = list
    .map((exp) => ({ exp, rel: relevanceScore({ category, subType, tagSet, grams }, exp) }))
    .filter((x) => x.rel > 0)
    .sort((a, b) => {
      if (b.rel !== a.rel) return b.rel - a.rel;
      const ea = Math.abs(a.exp.effectiveness);
      const eb = Math.abs(b.exp.effectiveness);
      if (eb !== ea) return eb - ea;
      return a.exp.id.localeCompare(b.exp.id);
    });

  const matchedCases: AdminMatchedCase[] = scored.slice(0, 5).map(({ exp, rel }) => ({
    id: exp.id,
    category: ADMIN_CATEGORY_LABEL[exp.category],
    subType: exp.subType,
    situation: exp.situation,
    action: exp.action,
    outcome: exp.outcome,
    effectiveness: exp.effectiveness,
    relevance: rel,
  }));

  // 成过的动作聚合：同 action 合并 timesWorked 与平均效果
  const good = new Map<
    string,
    { action: string; category: string; worked: number; effectSum: number }
  >();
  for (const { exp } of scored) {
    if (exp.effectiveness <= 0) continue;
    const key = exp.action;
    if (!key) continue;
    const cur = good.get(key) ?? { action: key, category: ADMIN_CATEGORY_LABEL[exp.category], worked: 0, effectSum: 0 };
    cur.worked += 1;
    cur.effectSum += exp.effectiveness;
    good.set(key, cur);
  }
  const recommendedActions: AdminRecommendedAction[] = [...good.values()]
    .map((g) => ({
      action: g.action,
      category: g.category,
      timesWorked: g.worked,
      avgEffectiveness: Math.round((g.effectSum / g.worked) * 100) / 100,
      evidence: `在你身上成过 ${g.worked} 次，平均效果 +${(Math.round((g.effectSum / g.worked) * 100) / 100).toFixed(2)}`,
    }))
    .sort((a, b) => b.avgEffectiveness - a.avgEffectiveness || b.timesWorked - a.timesWorked)
    .slice(0, 3);

  // 栽过的坑：本次情境相关、且效果为负的动作
  const pitfallsToAvoid: AdminPitfall[] = scored
    .filter(({ exp }) => exp.effectiveness < 0)
    .slice(0, 3)
    .map(({ exp }) => ({
      action: exp.action,
      lesson: exp.reflection || '（当时未留教训，请事后补一句复盘）',
      category: ADMIN_CATEGORY_LABEL[exp.category],
    }));

  // 置信度：命中条数（封顶 5）/5，再按命中平均效果方向微调
  const matchCount = scored.length;
  const hitCases = scored.slice(0, 5);
  const avgHitEffect =
    hitCases.length > 0
      ? hitCases.reduce((s, x) => s + x.exp.effectiveness, 0) / hitCases.length
      : 0;
  const confidence = Math.max(
    0,
    Math.min(1, Math.round((matchCount / 5) * 0.7 * 100) / 100 + Math.max(0, avgHitEffect) * 0.1),
  );

  // 一句话结论：有推荐动作就点名，否则提示风险
  let summary: string;
  if (recommendedActions.length > 0) {
    const top = recommendedActions[0];
    summary = `这类事你做过 ${matchCount} 次：最管用的是「${top.action}」（成过 ${top.timesWorked} 次，平均效果 +${top.avgEffectiveness.toFixed(2)}）`;
    if (pitfallsToAvoid.length > 0) {
      summary += `；别再用「${pitfallsToAvoid[0].action}」——你栽过，教训：${pitfallsToAvoid[0].lesson}`;
    }
    summary += '。';
  } else {
    summary =
      matchCount > 0
        ? `你遇到过 ${matchCount} 次类似情境，但效果都不理想，这次别照搬旧动作，先小范围试错再推广。`
        : `没有直接命中的本人战例，建议按冷启动基线打法小步试错，事后务必沉淀，下次我就能给你个性化建议。`;
  }

  return {
    staffId: sid,
    coldStart: false,
    matchedCases,
    recommendedActions,
    pitfallsToAvoid,
    confidence: Math.round(confidence * 100) / 100,
    summary,
  };
}

/** 冷启动基线打法（无本人战例时的通用起步动作） */
const BASELINE_PLAYBOOK: Record<AdminExperienceCategory, { action: string }> = {
  operations_decision: { action: '先拉 4 周同类运营数据定基线，小范围试点 2 周看指标，再决定是否全院推开' },
  management: { action: '把目标拆到科室主任头上，每周一对一站会盯进度，先解决一个最痛的堵点' },
  resource_allocation: { action: '按最近 4 周实际负荷（而非历史床位/人头）重排资源，预留 15% 弹性应对峰值' },
  crisis: { action: '30 分钟内成立应急小组、统一对外口径，先止损再查因，24 小时内出第一份时间线复盘' },
};

/* ------------------------------------------------------------------ */
/* 4) benchmarkAdminDecision —— 决策效果对标                            */
/* ------------------------------------------------------------------ */

/** 本次决策（事前） */
export interface AdminBenchmarkDecision {
  category?: unknown;
  subType?: unknown;
  action?: unknown;
  /** 事前预期效果 [-2,+2]（选填） */
  expectedEffectiveness?: unknown;
}

/** 本次决策事后结果 */
export interface AdminBenchmarkOutcome {
  effectiveness?: unknown;
  result?: unknown;
}

/** 对标结论三档 */
export type AdminBenchmarkVerdict = 'above_par' | 'on_par' | 'below_par';

/** 决策对标结果 */
export interface AdminDecisionBenchmark {
  staffId: string;
  category: string;
  /** 本次实际效果 [-2,+2] */
  thisEffectiveness: number;
  /** 本人同类历史均值 */
  ownCategoryAvg: number;
  /** 本人全部经验均值 */
  overallAvg: number;
  /** 本次 - 本人同类均值 */
  deltaVsOwn: number;
  /** 同类历史样本数 */
  sampleSize: number;
  verdict: AdminBenchmarkVerdict;
  /** 同类近期 vs 早期趋势 */
  trend: 'improving' | 'stable' | 'declining';
  /** 可执行复盘结论（不空喊） */
  reflectionPrompt: string;
}

/**
 * benchmarkAdminDecision：把一次刚落地的管理决策，与该管理员本人的历史基线对标。
 *
 * 口径：
 *  - ownCategoryAvg  本人同类别的历史平均效果；
 *  - deltaVsOwn      本次效果 - 同类均值；|Δ|≤0.3 判 on_par；>0.3 above；<−0.3 below；
 *  - trend           同类记录按时间均分两半，近半均值 > 早半均值 +0.2 → improving，
 *                    < −0.2 → declining，否则 stable（样本 <3 条判 stable）；
 *  - reflectionPrompt 数据说话：超额→建议固化 SOP；低于→定位是照搬不适配还是执行走样。
 *
 * 纯函数（只读图谱）：无同类历史时样本不足，verdict 仍给 on_par 并提示积累基线。
 */
export function benchmarkAdminDecision(
  staffId: string,
  decision: AdminBenchmarkDecision | null | undefined,
  outcome: AdminBenchmarkOutcome | null | undefined,
): AdminDecisionBenchmark {
  const sid = toStr(staffId) || 'unknown';
  const cat = normalizeCategory(decision?.category);
  const thisEff = toEffectiveness(outcome?.effectiveness);
  const all = readExperiences(sid);
  const sameCat = all.filter((r) => r.category === cat);

  const ownCategoryAvg =
    sameCat.length > 0
      ? Math.round((sameCat.reduce((s, r) => s + r.effectiveness, 0) / sameCat.length) * 100) / 100
      : 0;
  const overall = overallAvg(all);
  const delta = Math.round((thisEff - ownCategoryAvg) * 100) / 100;

  let verdict: AdminBenchmarkVerdict = 'on_par';
  if (sameCat.length >= 1) {
    if (delta > 0.3) verdict = 'above_par';
    else if (delta < -0.3) verdict = 'below_par';
  }

  // 趋势：同类样本按时间均分两半
  let trend: AdminDecisionBenchmark['trend'] = 'stable';
  if (sameCat.length >= 3) {
    const sorted = [...sameCat].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const half = Math.floor(sorted.length / 2);
    const early = sorted.slice(0, half);
    const late = sorted.slice(sorted.length - half);
    const avg = (arr: AdminExperienceRecord[]) =>
      arr.length > 0 ? arr.reduce((s, r) => s + r.effectiveness, 0) / arr.length : 0;
    const d = avg(late) - avg(early);
    if (d > 0.2) trend = 'improving';
    else if (d < -0.2) trend = 'declining';
  }

  // 可执行复盘结论
  let reflectionPrompt: string;
  if (sameCat.length === 0) {
    reflectionPrompt = `这是你${ADMIN_CATEGORY_LABEL[cat]}类第 1 次记录，暂无个人基线可对标。本次效果 ${thisEff.toFixed(2)}，先把做法写进反思，作为未来对标锚点。`;
  } else if (verdict === 'above_par') {
    reflectionPrompt = `本次 ${thisEff.toFixed(2)}，高于你同类历史均值 ${ownCategoryAvg.toFixed(2)}（Δ+${delta.toFixed(2)}）。把这次的关键动作与前提条件固化成 SOP，下次直接复用。`;
  } else if (verdict === 'below_par') {
    reflectionPrompt = `本次 ${thisEff.toFixed(2)}，低于你同类历史均值 ${ownCategoryAvg.toFixed(2)}（Δ${delta.toFixed(2)}）。重点查：是照搬了不适配的旧打法，还是执行环节走样？写清差异点再决定要不要纠偏。`;
  } else {
    reflectionPrompt = `本次 ${thisEff.toFixed(2)}，与你同类历史均值 ${ownCategoryAvg.toFixed(2)} 持平。可关注哪些变量在悄悄影响结果，积累到 5 次以上对标才更稳。`;
  }
  if (trend === 'improving') reflectionPrompt += ' 另：你这类决策呈改善趋势，保持。';
  if (trend === 'declining') reflectionPrompt += ' 另：你这类决策近期在走下坡，需警惕打法老化。';

  return {
    staffId: sid,
    category: ADMIN_CATEGORY_LABEL[cat],
    thisEffectiveness: thisEff,
    ownCategoryAvg,
    overallAvg: overall,
    deltaVsOwn: delta,
    sampleSize: sameCat.length,
    verdict,
    trend,
    reflectionPrompt,
  };
}
