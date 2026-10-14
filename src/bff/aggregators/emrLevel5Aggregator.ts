/**
 * 健澜科技 jlmedaios - 电子病历五级评审自评仪表盘聚合（M90-A + M93-B）
 *
 * 汇总两张历史评分表：
 *  - M90-A 在架质控：clinical.ai_note_qc（AI 实时在架质控，score + issues）
 *  - M93-B 终末质控：clinical.terminal_qc（归档前终末评分，grade + score + issues）
 *
 * 合格率口径：某日集合中 score ≥ 90 分的占比。
 * 降级策略：任一张表查询失败或两表近 30 日均无数据时，返回确定性演示序列（demo:true），
 * 绝不向路由层抛 500。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '@/db/pool.js';
import { gradeFromScore } from './terminalQcAggregator.js';
import type { AuthView } from '../view/userView.js';

export class EmrLevel5Error extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/* ------------------------------- 类型契约 ------------------------------- */

/** 某一自然日的合格率聚合结果 */
export interface TrendPoint {
  /** YYYY-MM-DD */
  date: string;
  /** 当日参评份数 */
  total: number;
  /** 当日合格份数（score ≥ 90） */
  passed: number;
  /** 合格率 0-1 */
  passRate: number;
}

/** 评级分布计数 */
export interface GradeDistribution {
  甲级: number;
  乙级: number;
  丙级: number;
}

/** 短板维度（问题规则按维度聚合后的出现次数） */
export interface WeaknessDimension {
  dimension: string;
  label: string;
  count: number;
}

export interface ModuleTrend {
  /** 模块编码：inpatient=在架质控 / terminal=终末质控 */
  key: 'inpatient' | 'terminal';
  label: string;
  trend: TrendPoint[];
}

export interface EmrLevel5Dashboard {
  /** true 表示当前为无真实数据时的演示兜底序列 */
  demo: boolean;
  /** 统计窗口天数（固定近 30 日） */
  rangeDays: number;
  /** 全院综合合格率趋势（两表合并） */
  trend: TrendPoint[];
  /** 分模块趋势 */
  modules: [ModuleTrend, ModuleTrend];
  /** 评级分布（甲/乙/丙） */
  gradeDistribution: GradeDistribution;
  /** 短板维度列表（按问题出现次数倒序，前 8） */
  weaknesses: WeaknessDimension[];
}

/** 两张历史表共有的轻量行结构 */
interface RawScoreRow {
  score: number | null;
  grade: string | null;
  created_at: string;
  issues: { rule: string; severity: string; message: string }[] | null;
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * passRateTrend：把若干评分记录按自然日分桶，计算每日合格率（score ≥ 90 占比），
 * 并按日期升序返回。score 为 null 或日期缺失的记录直接跳过，不计入分母。
 */
export function passRateTrend(
  records: { score: number | null; createdAt: string }[],
): TrendPoint[] {
  const byDay = new Map<string, { total: number; passed: number }>();
  for (const r of records) {
    if (r.score == null) continue;
    const day = (r.createdAt ?? '').slice(0, 10);
    if (!day) continue;
    const bucket = byDay.get(day) ?? { total: 0, passed: 0 };
    bucket.total += 1;
    if (r.score >= 90) bucket.passed += 1;
    byDay.set(day, bucket);
  }
  return [...byDay.entries()]
    .map(([date, b]) => ({
      date,
      total: b.total,
      passed: b.passed,
      passRate: b.total > 0 ? b.passed / b.total : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 问题规则前缀 → 短板维度中文名 */
const DIMENSION_LABEL: Record<string, string> = {
  completeness: '病历要素完整性',
  frontpage: '病案首页完整性',
  timeliness: '时效合规',
  accuracy: '诊断准确性',
  consistency: '文书一致性',
  safety: '用药与安全',
};

/** 把一行记录的 issues 拆成维度计数（纯函数） */
function collectWeaknesses(rows: RawScoreRow[]): WeaknessDimension[] {
  const counter = new Map<string, number>();
  for (const row of rows) {
    for (const issue of row.issues ?? []) {
      const key = (issue.rule ?? 'unknown').split('.')[0] || 'unknown';
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }
  }
  return [...counter.entries()]
    .map(([dimension, count]) => ({
      dimension,
      label: DIMENSION_LABEL[dimension] ?? dimension,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

/** 统计评级分布（纯函数）：终末表自带 grade，在架表按 score 反推等级 */
function collectGradeDistribution(rows: RawScoreRow[]): GradeDistribution {
  const dist: GradeDistribution = { 甲级: 0, 乙级: 0, 丙级: 0 };
  for (const row of rows) {
    const grade = row.grade ?? (row.score == null ? null : gradeFromScore(row.score));
    if (grade === '甲级' || grade === '乙级' || grade === '丙级') dist[grade] += 1;
  }
  return dist;
}

/** 把数据库行映射为 passRateTrend 入参 */
function toTrendInput(rows: RawScoreRow[]): { score: number | null; createdAt: string }[] {
  return rows.map((r) => ({ score: r.score, createdAt: r.created_at }));
}

/* ------------------------------ 演示兜底序列 ----------------------------- */

const RANGE_DAYS = 30;

/** 生成一条确定性的近 30 日演示序列（合格率从 0.80 平滑爬升到 0.93） */
function demoTrend(): TrendPoint[] {
  const out: TrendPoint[] = [];
  const today = new Date();
  for (let i = RANGE_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const total = 20 + ((i * 7) % 15);
    const rate = Math.round((0.80 + (RANGE_DAYS - i) * 0.0045) * 1000) / 1000;
    out.push({ date, total, passed: Math.round(total * rate), passRate: rate });
  }
  return out;
}

function demoDashboard(): EmrLevel5Dashboard {
  return {
    demo: true,
    rangeDays: RANGE_DAYS,
    trend: demoTrend(),
    modules: [
      { key: 'inpatient', label: 'M90-A 在架质控', trend: demoTrend() },
      { key: 'terminal', label: 'M93-B 终末质控', trend: demoTrend() },
    ],
    gradeDistribution: { 甲级: 218, 乙级: 86, 丙级: 17 },
    weaknesses: [
      { dimension: 'completeness', label: '病历要素完整性', count: 64 },
      { dimension: 'frontpage', label: '病案首页完整性', count: 41 },
      { dimension: 'timeliness', label: '时效合规', count: 28 },
      { dimension: 'accuracy', label: '诊断准确性', count: 15 },
    ],
  };
}

/* ------------------------------- 数据装载 ------------------------------- */

/** 近 30 日在架质控评分（M90-A），失败返回空数组 */
async function loadInpatientRows(): Promise<RawScoreRow[]> {
  try {
    const db = getDb();
    const rows = await db`
      SELECT score, NULL::text AS grade, created_at, issues
      FROM clinical.ai_note_qc
      WHERE created_at >= now() - interval '30 days'
    `;
    return rows as unknown as RawScoreRow[];
  } catch {
    return [];
  }
}

/** 近 30 日终末质控评分（M93-B），失败返回空数组 */
async function loadTerminalRows(): Promise<RawScoreRow[]> {
  try {
    const db = getDb();
    const rows = await db`
      SELECT score, grade::text AS grade, created_at, issues
      FROM clinical.terminal_qc
      WHERE created_at >= now() - interval '30 days'
    `;
    return rows as unknown as RawScoreRow[];
  } catch {
    return [];
  }
}

/* -------------------------------- 对外入口 ------------------------------- */

/**
 * 装载电子病历五级评审自评仪表盘。
 * 权限：emr_level5:view。两表均无数据（或查询失败）时返回演示序列，demo=true。
 */
export async function loadTrend(view: AuthView): Promise<EmrLevel5Dashboard> {
  if (!view.permissions.includes('emr_level5:view')) {
    throw new EmrLevel5Error(403, '无权限：需要 emr_level5:view');
  }

  const [inpatientRows, terminalRows] = await Promise.all([
    loadInpatientRows(),
    loadTerminalRows(),
  ]);
  const allRows = [...inpatientRows, ...terminalRows];

  if (allRows.length === 0) {
    return demoDashboard();
  }

  return {
    demo: false,
    rangeDays: RANGE_DAYS,
    trend: passRateTrend(toTrendInput(allRows)),
    modules: [
      { key: 'inpatient', label: 'M90-A 在架质控', trend: passRateTrend(toTrendInput(inpatientRows)) },
      { key: 'terminal', label: 'M93-B 终末质控', trend: passRateTrend(toTrendInput(terminalRows)) },
    ],
    gradeDistribution: collectGradeDistribution(allRows),
    weaknesses: collectWeaknesses(allRows),
  };
}
