/**
 * 健澜科技 jlmedaios - 个人 MUSE 主页数据聚合器（M115-A）
 *
 * 依据宪法第七章（全角色 Personal Agent）：为每位员工的个人 MUSE 主页
 *   聚合「越用越懂这位员工」的成长视图——总决策数、成功率、教训数、
 *   本周新增、经验时间线与近 30 天成长趋势。
 *
 * 设计要点：
 *  - buildMuseHomepage 为纯函数：不打库、不读环境、不修改入参；
 *    可选第 4 参 nowIso 注入「当前时间」，保证输出可快照、测试可复现；
 *  - successRate 保留 4 位小数（0~1），空决策集为 0；
 *  - 任一入参为 null / undefined / 空数组时返回零值兜底视图，绝不抛错；
 *  - growth30d 恒为 30 个日点（今天往前 29 天），空数据为平线 0，
 *    前端图表横轴永远稳定；
 *  - 聚合只使用脱敏后的决策摘要，不落患者直接标识符。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { StaffDecisionOutcome, StaffMuseRole } from './staffMuseAggregator.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 员工画像入参（路由层从 staff_muse_profile 塑形；纯函数侧不访问姓名以外的隐私） */
export interface MuseHomeProfile {
  /** 员工院内脱敏标识（staff_id） */
  staffId: string;
  /** 员工姓名（前端头像旁展示） */
  name: string;
  /** 岗位（doctor / nurse / pharma / admin） */
  role: StaffMuseRole;
  /** 头像 URL（可空，前端用姓名首字兜底） */
  avatarUrl?: string | null;
  /** 从业经验年限（可空） */
  yearsOfExperience?: number | null;
}

/** DB 侧预聚合统计（可空：缺项由 recentDecisions 现场兜底） */
export interface MuseHomeStats {
  /** 累计决策数（DB count；可空，缺省用 recentDecisions 长度兜底） */
  totalDecisions?: number | null;
  /** 成功决策数（DB 计数；可空，缺省从 recentDecisions 现场数） */
  successCount?: number | null;
  /** 教训数（DB 计数；可空，缺省从 recentDecisions 中 lesson 非空条数兜底） */
  lessonCount?: number | null;
}

/** 一条最近决策记忆（对应 medmuse.staff_decision_memory 一行） */
export interface MuseHomeDecision {
  /** 决策内容摘要（脱敏临床标签，如「拒绝该 DIP 病组自费方案」） */
  decision: string;
  /** 结局：成功 / 失败 / 混合 */
  outcome: StaffDecisionOutcome;
  /** 决策时间（ISO 8601；用于周新增与成长趋势分桶） */
  createdAt: string;
  /** 事后复盘 lesson（仅记录展示，不参与成功率计算） */
  lesson?: string | null;
}

/** 经验时间线单条 */
export interface MuseTimelineItem {
  /** yyyy-MM-dd */
  date: string;
  /** 决策摘要 */
  decision: string;
  /** 结局（前端按结局着色） */
  outcome: StaffDecisionOutcome;
  /** 复盘 lesson（有则展示） */
  lesson?: string;
}

/** 近 30 天成长趋势单点 */
export interface MuseGrowthPoint {
  /** yyyy-MM-dd */
  date: string;
  /** 截至当日的窗口内累计决策数 */
  count: number;
}

/** 个人 MUSE 主页视图（与前端 web/src/pages/muse/Home 对齐） */
export interface MuseHomepageView {
  /** 累计决策数 */
  totalDecisions: number;
  /** 成功率 = successCount / totalDecisions（0~1，4 位小数；空集 0） */
  successRate: number;
  /** 沉淀的教训数（失败/混合复盘条数） */
  lessonCount: number;
  /** 本周新增：近 7 天（滚动窗口）决策条数 */
  weekNew: number;
  /** 经验时间线：最近决策（按时间倒序，截断 8 条） */
  timeline: MuseTimelineItem[];
  /** 近 30 天成长趋势：逐日累计（恒 30 点） */
  growth30d: MuseGrowthPoint[];
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** 经验时间线最多展示条数 */
export const MUSE_TIMELINE_LIMIT = 8;

/** 成长趋势窗口天数 */
export const MUSE_GROWTH_DAYS = 30;

/** 周新增滚动窗口（毫秒） */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/** roundRate：成功率四舍五入到 4 位小数，避免浮点噪声导致快照不稳定 */
function roundRate(rate: number): number {
  return Math.round(rate * 10000) / 10000;
}

/** 两位补零 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Date → yyyy-MM-dd（本地日期口径，与 createdAt 截断到日对齐） */
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
function normalizeOutcome(v: unknown): StaffDecisionOutcome {
  if (v === 'success' || v === 'failure' || v === 'mixed') return v;
  return 'mixed';
}

/* ------------------------------------------------------------------ */
/* 纯函数主入口                                                        */
/* ------------------------------------------------------------------ */

/**
 * buildMuseHomepage：从员工画像、预聚合统计与最近决策记忆构建个人主页视图。
 *
 * 聚合口径：
 *  - totalDecisions  DB stats.totalDecisions 优先；缺省用 recentDecisions 条数兜底；
 *  - successRate     successCount / totalDecisions（4 位小数；空集 0）。
 *                    successCount 优先取 DB stats，缺省现场数 recentDecisions；
 *  - lessonCount     DB stats.lessonCount 优先；缺省数 recentDecisions 中 lesson
 *                    非空（trim 后）的条数；
 *  - weekNew         createdAt 落在 (now-7d, now] 滚动窗口内的决策条数；
 *  - timeline        按 createdAt 倒序取前 8 条，映射 {date, decision, outcome, lesson}；
 *  - growth30d       今天往前共 30 个自然日，逐日落窗计数后做累计（step 曲线口径），
 *                    即使某日无决策也保留该点（count 不回退）。
 *
 * 纯函数：不修改入参；任一入参为 null / undefined / 空数组时返回零值兜底视图，
 *   不抛错。profile 入参供路由层透传与冷启动兜底参考（聚合指标不依赖画像字段）。
 *
 * @param profile        员工画像（可空）
 * @param stats          DB 预聚合统计（可空或缺项）
 * @param recentDecisions 最近决策记忆（可空；路由建议传近 30 天全量）
 * @param nowIso         当前时间（可选；测试注入以固定快照，默认系统时钟）
 */
export function buildMuseHomepage(
  profile: MuseHomeProfile | null | undefined,
  stats: MuseHomeStats | null | undefined,
  recentDecisions: MuseHomeDecision[] | null | undefined,
  nowIso?: string,
): MuseHomepageView {
  // profile 仅作冷启动兜底上下文保留（无画像时同样输出零值视图）
  void profile;

  const decisions = (recentDecisions ?? []).filter(
    (d): d is MuseHomeDecision => Boolean(d) && typeof d.decision === 'string',
  );

  const fallbackSuccess = decisions.filter((d) => d.outcome === 'success').length;
  const totalDecisions =
    typeof stats?.totalDecisions === 'number' && Number.isFinite(stats.totalDecisions)
      ? Math.max(0, Math.floor(stats.totalDecisions))
      : decisions.length;
  const successCount =
    typeof stats?.successCount === 'number' && Number.isFinite(stats.successCount)
      ? Math.max(0, Math.floor(stats.successCount))
      : fallbackSuccess;

  const lessonCount =
    typeof stats?.lessonCount === 'number' && Number.isFinite(stats.lessonCount)
      ? Math.max(0, Math.floor(stats.lessonCount))
      : decisions.filter((d) => (d.lesson ?? '').trim().length > 0).length;

  // 当前时间（注入失败时回退系统时钟，绝不抛错）
  const nowMs = parseTime(nowIso) ?? Date.now();

  // 逐条清洗：解析时间、归一结局
  const rows = decisions.map((d) => ({
    decision: d.decision.trim(),
    outcome: normalizeOutcome(d.outcome),
    time: parseTime(d.createdAt),
    lesson: (d.lesson ?? '').trim(),
  }));

  // 周新增：滚动 7 天窗口
  const weekStart = nowMs - WEEK_MS;
  const weekNew = rows.filter(
    (r) => r.time !== null && r.time > weekStart && r.time <= nowMs,
  ).length;

  // 经验时间线：时间倒序（无时间的排最后），截断 8 条
  const timeline: MuseTimelineItem[] = rows
    .map((r, idx) => ({ row: r, idx }))
    .sort((a, b) => {
      const at = a.row.time ?? Number.NEGATIVE_INFINITY;
      const bt = b.row.time ?? Number.NEGATIVE_INFINITY;
      if (bt !== at) return bt - at;
      return a.idx - b.idx;
    })
    .slice(0, MUSE_TIMELINE_LIMIT)
    .map(({ row }) => ({
      date: row.time !== null ? dateKey(new Date(row.time)) : '未知日期',
      decision: row.decision,
      outcome: row.outcome,
      ...(row.lesson ? { lesson: row.lesson } : {}),
    }));

  // 近 30 天成长趋势：逐日新决策数 → 累计曲线
  const perDay = new Map<string, number>();
  for (const r of rows) {
    if (r.time === null) continue;
    const k = dateKey(new Date(r.time));
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const growth30d: MuseGrowthPoint[] = [];
  let cumulative = 0;
  for (let i = MUSE_GROWTH_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(nowMs - i * (24 * 60 * 60 * 1000));
    const k = dateKey(day);
    cumulative += perDay.get(k) ?? 0;
    growth30d.push({ date: k, count: cumulative });
  }

  return {
    totalDecisions,
    successRate:
      totalDecisions > 0 ? roundRate(successCount / totalDecisions) : 0,
    lessonCount,
    weekNew,
    timeline,
    growth30d,
  };
}
