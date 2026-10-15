/**
 * 健澜科技 jlmedaios - 电子病历五级评审八维度闭环自评聚合（M99-A）
 *
 * 八维度：医疗质量 / 护理管理 / 医技管理 / 患者服务 / 运营管理 /
 *         数据质量 / 信息安全 / 互联互通。
 *
 * 评分口径（纯函数）：
 *  - scoreDimension(items)：按维度内评审条款完成率折算得分，score = 完成率 × 满分。
 *  - generateSuggestions(dimension, ratio)：按完成率档位给出整改建议（<60% 红线整改 /
 *    <80% 定向补短板 / ≥80% 巩固推广）。
 *
 * 写库：submitView 将一次自评的 8 个维度逐条写入 clinical.emr_grade5_assessment；
 * 读库：listView 取每个维度最新一条记录（DISTINCT ON）组装雷达视图。
 * 无历史评分时返回确定性演示基线（demo:true），绝不向路由层抛 500。
 *
 * 权限：emr_level5:view（既有）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '@/db/pool.js';
import { getEnv } from '../config/env.js';
import type { AuthView } from '../view/userView.js';

export class EmrGrade5Error extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'EmrGrade5Error';
  }
}

/* ------------------------------- 类型契约 ------------------------------- */

/** 八维度编码（与前端雷达图轴序一致） */
export type DimensionKey =
  | 'medical_quality'
  | 'nursing_management'
  | 'medtech_management'
  | 'patient_service'
  | 'operations'
  | 'data_quality'
  | 'information_security'
  | 'interoperability';

/** 维度元数据：编码 + 中文名（固定顺序即雷达图轴序） */
export interface DimensionMeta {
  key: DimensionKey;
  label: string;
}

/** 八维度目录（固定顺序） */
export const GRADE5_DIMENSIONS: readonly DimensionMeta[] = [
  { key: 'medical_quality', label: '医疗质量' },
  { key: 'nursing_management', label: '护理管理' },
  { key: 'medtech_management', label: '医技管理' },
  { key: 'patient_service', label: '患者服务' },
  { key: 'operations', label: '运营管理' },
  { key: 'data_quality', label: '数据质量' },
  { key: 'information_security', label: '信息安全' },
  { key: 'interoperability', label: '互联互通' },
] as const;

/** 单条评审条款完成情况 */
export interface DimensionItem {
  /** 该条款是否达标完成 */
  achieved: boolean;
}

/** 单维度评分结果（纯函数产物） */
export interface DimensionScore {
  dimension: DimensionKey;
  label: string;
  /** 折算得分（完成率 × 满分，保留两位小数） */
  score: number;
  /** 维度满分（默认 100） */
  maxScore: number;
  /** 完成率 0-1 */
  ratio: number;
  achievedCount: number;
  totalCount: number;
  /** 整改建议列表 */
  suggestions: string[];
}

/** 一次完整自评视图（雷达图 + 得分表 + 建议列表） */
export interface Grade5Assessment {
  /** true 表示无历史评分时的演示基线 */
  demo: boolean;
  /** 本批评估时间（ISO），演示基线为 null */
  assessedAt: string | null;
  /** 八维合计得分 */
  totalScore: number;
  /** 八维满分合计 */
  maxTotal: number;
  dimensions: DimensionScore[];
}

/** 前端提交的单维度输入 */
export interface Grade5DimensionInput {
  dimension: string;
  items: DimensionItem[];
}

/** 数据库原始行 */
interface RawRow {
  dimension: string;
  score: string | number;
  max_score: string | number;
  evidence: string | null;
  suggestions: string | null;
  assessed_at: string;
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * scoreDimension：按维度内评审条款完成率折算得分。
 *
 * 口径：完成率 = achieved / total；score = round(完成率 × maxScore, 2)。
 * 空条款集合（total = 0）视为未开展，ratio = 0、score = 0。
 *
 * @param items 维度内评审条款清单
 * @param maxScore 维度满分，默认 100
 */
export function scoreDimension(
  items: readonly DimensionItem[],
  maxScore = 100,
): { score: number; ratio: number; achievedCount: number; totalCount: number } {
  const total = items.length;
  const achieved = items.filter((i) => i.achieved).length;
  const ratio = total > 0 ? achieved / total : 0;
  const score = Math.round(ratio * maxScore * 100) / 100;
  return { score, ratio, achievedCount: achieved, totalCount: total };
}

/** 维度 → 该维度评审聚焦点（用于建议文案） */
const DIMENSION_FOCUS: Record<DimensionKey, string> = {
  medical_quality: '病历书写质量与病案首页质控',
  nursing_management: '护理记录规范性与护理措施闭环',
  medtech_management: '检验检查全流程时效与危急值闭环',
  patient_service: '患者满意度与投诉建议整改闭环',
  operations: '床位周转、平均住院日与运营效率',
  data_quality: 'EMPI 主索引一致性与数据准确率',
  information_security: '等保三级、权限最小化与审计留痕',
  interoperability: '院内信息平台互联互通标准化成熟度',
};

/**
 * generateSuggestions：按完成率档位生成整改建议。
 *
 * 档位：
 *  - ratio < 0.60：红线项，30 日专项整改并复验；
 *  - ratio < 0.80：未达五级基线，定向补短板；
 *  - ratio ≥ 0.80：达标，沉淀模板推广。
 *
 * @param dimension 维度编码（未知编码回退为通用建议）
 * @param scoreRatio 完成率 0-1
 */
export function generateSuggestions(dimension: string, scoreRatio: number): string[] {
  const ratio = Math.min(1, Math.max(0, scoreRatio));
  const pct = Math.round(ratio * 100);
  const focus = DIMENSION_FOCUS[dimension as DimensionKey] ?? '本维度';

  if (ratio < 0.6) {
    return [
      `${focus} 完成率仅 ${pct}%，列为五级评审红线项，30 日内完成专项整改并组织复验`,
      '对照《电子病历系统应用水平分级评价管理办法》逐条核对缺失条款，建立科室整改台账、责任到人',
      '医务、护理、信息科联合周例会督办，整改完成率纳入科室绩效考核',
    ];
  }
  if (ratio < 0.8) {
    return [
      `${focus} 完成率 ${pct}%，未达五级评审 80% 基线，需定向补短板`,
      '针对未达标条款制定月度提升计划，每周通报完成率变化趋势',
      '启用 AI 实时在架质控规则自动拦截缺陷病历，降低人工复核成本',
    ];
  }
  return [
    `${focus} 完成率 ${pct}%，已达五级评审基线，保持常态化运行`,
    '沉淀优秀实践为标准模板，向全院科室推广并按季度复评',
  ];
}

/* ------------------------------ 演示基线 ------------------------------- */

/** 八维度演示基线得分（确定性序列，无历史评分时兜底） */
const DEMO_SCORES: Readonly<Record<DimensionKey, number>> = {
  medical_quality: 88,
  nursing_management: 82,
  medtech_management: 76,
  patient_service: 90,
  operations: 70,
  data_quality: 65,
  information_security: 92,
  interoperability: 58,
};

/** 由演示基线得分组装演示视图（建议文案走纯函数，保证口径一致） */
function demoAssessment(): Grade5Assessment {
  const dimensions: DimensionScore[] = GRADE5_DIMENSIONS.map((d) => {
    const score = DEMO_SCORES[d.key];
    const ratio = score / 100;
    return {
      dimension: d.key,
      label: d.label,
      score,
      maxScore: 100,
      ratio,
      achievedCount: Math.round(ratio * 10),
      totalCount: 10,
      suggestions: generateSuggestions(d.key, ratio),
    };
  });
  return {
    demo: true,
    assessedAt: null,
    totalScore: Math.round(dimensions.reduce((s, d) => s + d.score, 0) * 100) / 100,
    maxTotal: dimensions.reduce((s, d) => s + d.maxScore, 0),
    dimensions,
  };
}

/* ------------------------------- 数据装载 ------------------------------- */

/** 权限断言：emr_level5:view */
function assertPermission(view: AuthView): void {
  if (!view.permissions.includes('emr_level5:view')) {
    throw new EmrGrade5Error(403, '无权限：需要 emr_level5:view');
  }
}

/** 每维度取最新一条评分，失败返回空数组 */
async function loadLatestRows(): Promise<RawRow[]> {
  try {
    const db = getDb();
    const rows = await db`
      SELECT DISTINCT ON (dimension)
        dimension, score, max_score, evidence, suggestions, assessed_at
      FROM clinical.emr_grade5_assessment
      ORDER BY dimension, assessed_at DESC
    `;
    return rows as unknown as RawRow[];
  } catch {
    return [];
  }
}

/** 把数据库行映射为维度评分（维度顺序以 GRADE5_DIMENSIONS 为准） */
function toDimensionScores(rows: RawRow[]): DimensionScore[] {
  const byDim = new Map<string, RawRow>();
  for (const r of rows) byDim.set(r.dimension, r);
  return GRADE5_DIMENSIONS.map((meta) => {
    const row = byDim.get(meta.key);
    if (!row) {
      return {
        dimension: meta.key,
        label: meta.label,
        score: 0,
        maxScore: 100,
        ratio: 0,
        achievedCount: 0,
        totalCount: 0,
        suggestions: generateSuggestions(meta.key, 0),
      };
    }
    const score = Number(row.score);
    const maxScore = Number(row.max_score) || 100;
    const ratio = maxScore > 0 ? score / maxScore : 0;
    const suggestions = (row.suggestions ?? '')
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      dimension: meta.key,
      label: meta.label,
      score,
      maxScore,
      ratio,
      achievedCount: 0,
      totalCount: 0,
      suggestions: suggestions.length > 0 ? suggestions : generateSuggestions(meta.key, ratio),
    };
  });
}

/* -------------------------------- 对外入口 ------------------------------- */

/**
 * listView：读取八维度最新自评结果。
 * 权限：emr_level5:view。DEMO_MODE 直接返回内存演示基线；
 * 真实模式下表为空（或查询失败）时同样回退演示基线，demo=true，绝不向路由层抛 500。
 */
export async function listView(view: AuthView): Promise<Grade5Assessment> {
  assertPermission(view);
  // DEMO_MODE：短路，避免 getDb() 在无 PG 环境下建池/连库
  if (getEnv().demoMode) return demoAssessment();
  const rows = await loadLatestRows();
  if (rows.length === 0) return demoAssessment();

  const dimensions = toDimensionScores(rows);
  const assessedAt = rows[0]?.assessed_at ?? null;
  return {
    demo: false,
    assessedAt,
    totalScore: Math.round(dimensions.reduce((s, d) => s + d.score, 0) * 100) / 100,
    maxTotal: dimensions.reduce((s, d) => s + d.maxScore, 0),
    dimensions,
  };
}

/**
 * submitView：发起一次八维度闭环自评。
 * 按维度逐条用 scoreDimension 折算得分、generateSuggestions 生成建议，
 * 然后整批写入 clinical.emr_grade5_assessment，并回读本次评分视图。
 *
 * @param view 当前登录用户
 * @param payload.dimensions 八维度条款完成清单（缺省维度按 0 分计）
 */
export async function submitView(
  view: AuthView,
  payload: { dimensions: readonly Grade5DimensionInput[] },
): Promise<Grade5Assessment> {
  assertPermission(view);

  const inputByDim = new Map<string, readonly DimensionItem[]>();
  for (const d of payload.dimensions ?? []) {
    inputByDim.set(d.dimension, Array.isArray(d.items) ? d.items : []);
  }

  const computed: DimensionScore[] = GRADE5_DIMENSIONS.map((meta) => {
    const items = inputByDim.get(meta.key) ?? [];
    const { score, ratio, achievedCount, totalCount } = scoreDimension(items, 100);
    return {
      dimension: meta.key,
      label: meta.label,
      score,
      maxScore: 100,
      ratio,
      achievedCount,
      totalCount,
      suggestions: generateSuggestions(meta.key, ratio),
    };
  });

  // DEMO_MODE：跳过写库，直接返回本次计算视图（demo:true 不持久化）
  if (getEnv().demoMode) {
    return {
      demo: true,
      assessedAt: null,
      totalScore: Math.round(computed.reduce((s, d) => s + d.score, 0) * 100) / 100,
      maxTotal: computed.reduce((s, d) => s + d.maxScore, 0),
      dimensions: computed,
    };
  }

  try {
    const db = getDb();
    for (const d of computed) {
      const evidence = `完成 ${d.achievedCount}/${d.totalCount} 项评审条款`;
      const suggestionsText = d.suggestions.join('\n');
      await db`
        INSERT INTO clinical.emr_grade5_assessment
          (dimension, score, max_score, evidence, suggestions)
        VALUES (${d.dimension}, ${d.score}, ${d.maxScore}, ${evidence}, ${suggestionsText})
      `;
    }
  } catch (e) {
    throw new EmrGrade5Error(500, `自评结果写入失败：${e instanceof Error ? e.message : '未知错误'}`);
  }

  return listView(view);
}
