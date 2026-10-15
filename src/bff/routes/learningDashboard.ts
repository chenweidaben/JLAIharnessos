/**
 * 健澜科技 jlmedaios - 学习引擎监控看板路由
 *
 * 依据宪法第三章（国家机构民生保障与公共服务信息化职责）精神：
 *   GET /api/v1/learning/dashboard
 *     返回学习引擎四张图数据：
 *       adoptionRate        采纳率趋势（M108 反馈日志逐日折算）；
 *       weightDistribution  当前激活策略权重分布（饼图口径）；
 *       knowledgeGrowth     知识库累计增长曲线；
 *       patientProfileCoverage 患者学习画像覆盖率（已画像 / 引擎触达）。
 *
 * 医疗安全：本端点纯只读，不触发权重发布、不写反馈；
 *           看板不返回患者直接标识符，覆盖率为聚合比值。
 * 权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildLearningDashboard,
  type CoveragePoint,
  type FeedbackRow,
  type KnowledgeState,
  type StrategyRow,
} from '../aggregators/learningDashboardAggregator';

/** 无 DB 演示模式：返回样例看板，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/**
 * 从 DB 拉取三类源数据并塑形为纯函数入参，产出看板视图。
 *
 * @returns buildLearningDashboard 的完整结果 + demo 标记
 */
async function buildView(): Promise<{ demo: boolean; dashboard: ReturnType<typeof buildLearningDashboard> }> {
  const db = getDb();

  // 1) 反馈日志（M108）
  const fbRows = (await db`
    SELECT suggestion_type, doctor_decision, created_at
    FROM medmuse.ai_feedback_log
  `) as Array<Record<string, unknown>>;
  const feedbackLog: FeedbackRow[] = fbRows.map((r) => ({
    suggestionType: (r.suggestion_type as string | null) ?? null,
    decision: (r.doctor_decision as string) ?? '',
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  }));

  // 2) 策略版本（仅激活版本参与权重分布）
  const stRows = (await db`
    SELECT weights_json, active FROM medmuse.recommendation_strategy
  `) as Array<Record<string, unknown>>;
  const strategies: StrategyRow[] = stRows.map((r) => ({
    weights: (r.weights_json as Record<string, number>) ?? {},
    active: Boolean(r.active),
  }));

  // 3a) 知识库新增条目（增长曲线）
  const kbRows = (await db`
    SELECT created_at FROM knowledge.documents
  `) as Array<Record<string, unknown>>;
  const entries = kbRows.map((r) => ({
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  }));

  // 3b) 画像覆盖率：今日快照 + 历史日指标序列
  const profiled = Number(((await db`SELECT count(*)::int AS n FROM medmuse.patient_learning_profile`) as unknown as Array<{ n: number }>)[0]?.n ?? 0);
  const total = Number(
    ((await db`SELECT count(DISTINCT patient_id)::int AS n
       FROM medmuse.ai_feedback_log WHERE patient_id IS NOT NULL`) as unknown as Array<{ n: number }>)[0]?.n ?? 0,
  );
  const todayRate = total > 0 ? profiled / total : 0;

  const histRows = (await db`
    SELECT metric_date, value
    FROM medmuse.learning_metrics_daily
    WHERE metric_name = 'patient_profile_coverage'
    ORDER BY metric_date DESC
    LIMIT 14
  `) as Array<Record<string, unknown>>;
  const coverageSeries: CoveragePoint[] = histRows
    .map((r) => ({
      date: String(r.metric_date),
      profiled: 0,
      total: 0,
      rate: Number(r.value ?? 0),
    }))
    .reverse();
  coverageSeries.push({
    date: new Date().toISOString().slice(0, 10),
    profiled,
    total,
    rate: todayRate,
  });

  const knowledge: KnowledgeState = { entries, coverageSeries };
  return { demo: false, dashboard: buildLearningDashboard(feedbackLog, strategies, knowledge) };
}

/** 演示模式样例：近 5 天采纳率爬坡、权重三分、知识持续入库、画像逐步覆盖 */
function demoDashboard(): ReturnType<typeof buildLearningDashboard> {
  const today = new Date();
  const day = (offset: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  const feedbackLog: FeedbackRow[] = [];
  // 近 3 天反馈：采纳率逐日上升 0.60 -> 0.72 -> 0.80
  const plan: Array<[number, number, number, number]> = [
    // [偏移天数, 采纳, 修改, 拒绝]
    [2, 60, 12, 28],
    [1, 72, 14, 14],
    [0, 80, 10, 10],
  ];
  for (const [offset, adopted, modified, rejected] of plan) {
    for (let i = 0; i < adopted; i += 1) feedbackLog.push({ suggestionType: 'diagnosis', decision: 'adopted', createdAt: `${day(offset)}T09:00:00Z` });
    for (let i = 0; i < modified; i += 1) feedbackLog.push({ suggestionType: 'drug', decision: 'modified', createdAt: `${day(offset)}T10:00:00Z` });
    for (let i = 0; i < rejected; i += 1) feedbackLog.push({ suggestionType: 'pathway', decision: 'rejected', createdAt: `${day(offset)}T11:00:00Z` });
  }
  const strategies: StrategyRow[] = [
    { weights: { diagnosis: 0.5, drug: 0.3, pathway: 0.2 }, active: true },
  ];
  const knowledge: KnowledgeState = {
    entries: [
      { createdAt: `${day(4)}T08:00:00Z` },
      { createdAt: `${day(3)}T08:00:00Z` },
      { createdAt: `${day(2)}T08:00:00Z` },
      { createdAt: `${day(1)}T08:00:00Z` },
      { createdAt: `${day(0)}T08:00:00Z` },
    ],
    coverageSeries: [
      { date: day(2), profiled: 120, total: 200, rate: 0.6 },
      { date: day(1), profiled: 140, total: 200, rate: 0.7 },
      { date: day(0), profiled: 160, total: 200, rate: 0.8 },
    ],
  };
  return buildLearningDashboard(feedbackLog, strategies, knowledge);
}

export const learningDashboardRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/learning/dashboard',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;
      try {
        if (isDemo) {
          return json(ok({ demo: true, dashboard: demoDashboard() }));
        }
        const view = await buildView();
        return json(ok(view));
      } catch (err) {
        console.error(`[learningDashboard] GET /dashboard [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '学习引擎看板统计失败', c.traceId),
          500,
        );
      }
    },
  },
];
