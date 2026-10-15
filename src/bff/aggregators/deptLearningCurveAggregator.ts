/**
 * 健澜科技 jlmedaios - 科室学习曲线聚合（M119-B）
 *
 * 依据宪法第七章「Doctor MUSE / 全角色 Personal Agent」：
 *  - 7.2 科室层：科室全员个人智能体的决策经验按月沉淀，
 *    形成「上手 → 熟练 → 精通」的组织学习曲线，可横向对比科室间成长速度；
 *  - 7.7 经验记录铁律：失败经验（教训）单独成桶，学习曲线的核心证据是
 *    「逐月教训数下降 + 成功率爬升」双指标共振；
 *  - 7.8 后继者机制：bestPracticeCount（可复用最佳实践数）即新员工入职时
 *    自动加载的科室基线规模，越多说明科室知识资产越厚。
 *
 * 纯函数核心（不触库、无副作用、可直接单测）：
 *  - buildDeptLearningCurve(deptCode, timeRange, decisions)：
 *      按科室过滤 → 按月分桶 → 输出 { monthlyGrowth, successTrend,
 *      lessonReduction, bestPracticeCount } 四件套；
 *  - compareDeptCurves(deptCodes, allData, options?)：
 *      对多个科室分别 build，返回 comparison[] 供对比柱状图渲染。
 *
 * 入参 decisions 为全院个人智能体已沉淀的决策事件行（camelCase），
 * 本聚合器只消费与 deptCode 匹配的行，其余科室数据一律忽略。
 * 空科室 / 空窗口 / 脏数据一律返回结构完整的零值结果，绝不抛异常。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 一条科室决策事件（学习曲线的最小观测单元） */
export interface LearningCurveDecision {
  /** 员工主键（溯源用，聚合结果不外露） */
  staffId: string;
  /** 所属科室编码 */
  deptCode: string;
  /** 决策要点主题（跨员工合并的主键，如「CAP 经验性抗感染首选」） */
  topic: string;
  /** 决策结局是否成功（false → 计入教训桶，7.7） */
  success: boolean;
  /** 决策发生时间（ISO 8601，缺失/非法将被跳过且不炸聚合） */
  createdAt: string;
}

/** 时间窗参数 */
export interface LearningTimeRange {
  /** 回溯窗口月数，默认 6（1~24 之间收敛） */
  months?: number;
  /** 锚定时间 ISO（测试可固定；默认当前时刻） */
  now?: string;
}

/** 月度增长点 */
export interface MonthlyGrowthPoint {
  /** 月份键 YYYY-MM */
  month: string;
  /** 当月决策条数 */
  count: number;
  /** 环比上月增长百分比（首月无上月锚点，为 null） */
  momGrowthPct: number | null;
}

/** 月度成功率点（学习曲线主趋势线） */
export interface SuccessTrendPoint {
  /** 月份键 YYYY-MM */
  month: string;
  /** 当月成功率 0~1（4 位小数） */
  successRate: number;
  /** 当月样本量（成功率置信度的依据） */
  sampleSize: number;
}

/** 月度教训点 */
export interface LessonTrendPoint {
  /** 月份键 YYYY-MM */
  month: string;
  /** 当月教训条数（失败决策数，7.7 单独成桶） */
  lessons: number;
}

/** 教训下降态势（学习是否生效的反向指标） */
export interface LessonReduction {
  /** 逐月教训数（柱状图用） */
  monthly: LessonTrendPoint[];
  /**
   * 教训降幅百分比：后半窗口月均教训数相对前半窗口月均的下降幅度。
   * 正数 = 教训在减少（学习生效）；负数 = 教训在抬头（预警）。
   */
  reductionPct: number;
}

/** 单科室学习曲线（任务契约四件套 + 窗口元信息） */
export interface DeptLearningCurve {
  /** 科室编码 */
  deptCode: string;
  /** 时间窗元信息 */
  window: { from: string; to: string; months: number };
  /** 逐月决策量与环比增长（知识资产增厚速度） */
  monthlyGrowth: MonthlyGrowthPoint[];
  /** 逐月成功率（学习曲线主轴：应逐月爬升） */
  successTrend: SuccessTrendPoint[];
  /** 逐月教训量与降幅（7.7 铁律：教训应逐月收敛） */
  lessonReduction: LessonReduction;
  /** 可复用最佳实践数：窗口内累计 ≥5 次且成功率 ≥0.8 的主题数 */
  bestPracticeCount: number;
}

/** compareDeptCurves 单条对比行 */
export interface DeptCurveComparisonRow {
  /** 科室编码 */
  deptCode: string;
  /** 窗口内决策总条数 */
  totalDecisions: number;
  /** 窗口内整体成功率 0~1（4 位小数） */
  avgSuccessRate: number;
  /** 教训降幅（%） */
  reductionPct: number;
  /** 最佳实践数 */
  bestPracticeCount: number;
  /** 该科室完整学习曲线（前端可下钻） */
  curve: DeptLearningCurve;
}

/** buildDeptLearningCurve 可选项 */
export interface BuildCurveOptions {
  /** 最佳实践认定：主题窗口内累计次数下限，默认 5 */
  bestPracticeMinCount?: number;
  /** 最佳实践认定：主题窗口内成功率下限，默认 0.8 */
  bestPracticeMinSuccessRate?: number;
}

/* ------------------------------- 常量与工具 ------------------------------- */

/** 默认回溯窗口月数 */
const DEFAULT_MONTHS = 6;
/** 窗口月数收敛下界 / 上界 */
const MIN_MONTHS = 1;
const MAX_MONTHS = 24;
/** 默认最佳实践认定阈值 */
const DEFAULT_BEST_MIN_COUNT = 5;
const DEFAULT_BEST_MIN_RATE = 0.8;

/** 把任意输入收敛为合法月数（防御性：NaN / 负数 / 超界一律夹取） */
function clampMonths(raw: number | undefined): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return DEFAULT_MONTHS;
  return Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, n));
}

/** 把 Date 格式化为 YYYY-MM */
function monthKeyOf(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * 生成 [to-(months-1), to] 的 YYYY-MM 升序月份轴（确定、可单测）。
 * to 由 now 锚定（UTC），保证跨时区结果一致。
 */
function buildMonthAxis(nowIso: string | undefined, months: number): string[] {
  const anchorRaw = nowIso ? new Date(nowIso) : new Date();
  const anchor = Number.isFinite(anchorRaw.getTime()) ? anchorRaw : new Date();
  const to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const axis: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(to);
    d.setUTCMonth(d.getUTCMonth() - i);
    axis.push(monthKeyOf(d));
  }
  return axis;
}

/** 从 createdAt 提取月份键；非法时间返回 null（调用方跳过） */
function pickMonthKey(createdAt: string): string | null {
  const raw = String(createdAt ?? '').trim();
  if (/^\d{4}-\d{2}(-|T|$)/.test(raw)) return raw.slice(0, 7);
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return null;
  return monthKeyOf(d);
}

/** 保留 n 位小数（四舍五入） */
function roundTo(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * buildDeptLearningCurve：单科室学习曲线总入口（依据宪法第七章 7.2 / 7.7 / 7.8）。
 *
 * 流程：
 *  1. 按 deptCode 过滤 decisions（防御性：只消费本科室数据）；
 *  2. 按 timeRange.months 生成升序月份轴，把合法决策归入对应月桶；
 *  3. monthlyGrowth：逐月条数 + 环比上月增长%（首月为 null）；
 *  4. successTrend：逐月成功率（学习曲线主轴，应爬升）；
 *  5. lessonReduction：逐月教训数（= 失败决策数），
 *     reductionPct = 后半窗口月均教训相对前半窗口月均的降幅；
 *  6. bestPracticeCount：窗口内累计次数 ≥ 阈值且成功率 ≥ 阈值的主题数
 *     （7.8 后继者机制可加载的科室基线规模）。
 *
 * 纯函数：不修改入参；空科室 / 空窗口 / 非法时间一律返回结构完整的
 * 零值结果，绝不抛异常（7.7「不评判对错，只记录事实」）。
 *
 * @param deptCode 科室编码
 * @param timeRange 时间窗（months 默认 6；now 锚定时间）
 * @param decisions 全院决策事件行
 * @param options 最佳实践认定阈值
 * @returns 学习曲线四件套 + 窗口元信息
 */
export function buildDeptLearningCurve(
  deptCode: string,
  timeRange: LearningTimeRange | undefined,
  decisions: readonly LearningCurveDecision[],
  options?: BuildCurveOptions,
): DeptLearningCurve {
  const code = (deptCode ?? '').trim();
  const months = clampMonths(timeRange?.months);
  const axis = buildMonthAxis(timeRange?.now, months);

  const minCount = Math.max(0, options?.bestPracticeMinCount ?? DEFAULT_BEST_MIN_COUNT);
  const minRate = Math.min(1, Math.max(0, options?.bestPracticeMinSuccessRate ?? DEFAULT_BEST_MIN_RATE));

  /* 1. 科室过滤 + 月份归桶 */
  const byMonth = new Map<string, { total: number; success: number; lessons: number }>();
  for (const m of axis) byMonth.set(m, { total: 0, success: 0, lessons: 0 });

  /* 主题窗口累计（最佳实践认定用） */
  const byTopic = new Map<string, { total: number; success: number }>();

  const rows = (decisions ?? []).filter((d) => (d?.deptCode ?? '').trim() === code);
  for (const row of rows) {
    const mk = pickMonthKey(String(row.createdAt ?? ''));
    if (!mk || !byMonth.has(mk)) continue; // 窗口外 / 脏数据静默跳过
    const bucket = byMonth.get(mk)!;
    bucket.total += 1;
    if (row.success) bucket.success += 1;
    else bucket.lessons += 1; // 7.7：失败经验单独成桶

    const topic = (row.topic ?? '').trim();
    if (topic) {
      const t = byTopic.get(topic) ?? { total: 0, success: 0 };
      t.total += 1;
      if (row.success) t.success += 1;
      byTopic.set(topic, t);
    }
  }

  /* 2. monthlyGrowth：条数 + 环比 */
  const monthlyGrowth: MonthlyGrowthPoint[] = axis.map((m, i) => {
    const count = byMonth.get(m)!.total;
    if (i === 0) return { month: m, count, momGrowthPct: null };
    const prev = byMonth.get(axis[i - 1])!.total;
    let momGrowthPct: number;
    if (prev === 0) momGrowthPct = count > 0 ? 100 : 0;
    else momGrowthPct = roundTo(((count - prev) / prev) * 100, 1);
    return { month: m, count, momGrowthPct };
  });

  /* 3. successTrend：逐月成功率 */
  const successTrend: SuccessTrendPoint[] = axis.map((m) => {
    const b = byMonth.get(m)!;
    return {
      month: m,
      successRate: b.total === 0 ? 0 : roundTo(b.success / b.total, 4),
      sampleSize: b.total,
    };
  });

  /* 4. lessonReduction：逐月教训 + 前后半窗口降幅 */
  const monthly: LessonTrendPoint[] = axis.map((m) => ({
    month: m,
    lessons: byMonth.get(m)!.lessons,
  }));
  const half = Math.floor(axis.length / 2);
  const firstHalf = monthly.slice(0, half).map((x) => x.lessons);
  const secondHalf = monthly.slice(half).map((x) => x.lessons);
  const avg = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((s, x) => s + x, 0) / arr.length);
  const firstAvg = avg(firstHalf);
  const secondAvg = avg(secondHalf);
  let reductionPct: number;
  if (firstAvg === 0) reductionPct = secondAvg === 0 ? 0 : -100;
  else reductionPct = roundTo(((firstAvg - secondAvg) / firstAvg) * 100, 1);

  /* 5. bestPracticeCount：窗口内高频且高成功率的主题数（7.8 科室基线规模） */
  let bestPracticeCount = 0;
  for (const t of byTopic.values()) {
    if (t.total < minCount) continue;
    if (t.total > 0 && t.success / t.total >= minRate) bestPracticeCount += 1;
  }

  return {
    deptCode: code,
    window: { from: axis[0] ?? '', to: axis[axis.length - 1] ?? '', months },
    monthlyGrowth,
    successTrend,
    lessonReduction: { monthly, reductionPct },
    bestPracticeCount,
  };
}

/**
 * compareDeptCurves：多科室学习曲线横向对比（依据宪法第七章 7.2 组织级沉淀）。
 *
 * 逐科室调用 buildDeptLearningCurve，产出与 deptCodes 顺序严格对齐的
 * comparison[]：对比柱状图按行渲染 avgSuccessRate / bestPracticeCount /
 * reductionPct 三个可比口径。空科室 / 不在数据中的科室返回零值行，
 * 不抛异常、不打乱顺序。
 *
 * 纯函数：不修改入参。
 *
 * @param deptCodes 待对比科室编码列表（顺序即输出顺序）
 * @param allData 全院决策事件行
 * @param options 时间窗与最佳实践阈值（透传 buildDeptLearningCurve）
 * @returns 与 deptCodes 对齐的对比行数组
 */
export function compareDeptCurves(
  deptCodes: readonly string[],
  allData: readonly LearningCurveDecision[],
  options?: BuildCurveOptions & { timeRange?: LearningTimeRange },
): DeptCurveComparisonRow[] {
  const uniq = [...new Set((deptCodes ?? []).map((c) => (c ?? '').trim()).filter(Boolean))];
  return uniq.map((code) => {
    const curve = buildDeptLearningCurve(code, options?.timeRange, allData ?? [], options);

    const totalDecisions = curve.monthlyGrowth.reduce((s, p) => s + p.count, 0);
    const win = curve.successTrend;
    const totalSuccess = win.reduce((s, p) => s + p.successRate * p.sampleSize, 0);
    const avgSuccessRate = totalDecisions === 0 ? 0 : roundTo(totalSuccess / totalDecisions, 4);

    return {
      deptCode: code,
      totalDecisions,
      avgSuccessRate,
      reductionPct: curve.lessonReduction.reductionPct,
      bestPracticeCount: curve.bestPracticeCount,
      curve,
    };
  });
}
