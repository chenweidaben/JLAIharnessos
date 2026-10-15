/**
 * 健澜科技 jlmedaios - 管理驾驶舱运营规律洞察路由
 *
 * 依据宪法第四章「越用越懂运营规律」：
 *   GET /api/v1/dashboard/operational-insights
 *     返回 AI 异常卡片（异常点 / 周期规律 / 趋势通道），即
 *     medmuse.operational_insight 中未运营确认（acknowledged_at IS NULL）的行；
 *     卡片由纯函数聚合器（aggregators/operationalInsightAggregator.ts）产出，
 *     本端点只读拉取，确认归档由后续闭环写 acknowledged_at 完成。
 *
 * 医疗安全：洞察仅为运营辅助提示，不触发诊疗行为、不直接改价/改排班；
 *           所有建议动作须由运营人员人工确认后执行。
 * 权限：medmuse:view（管理驾驶舱只读）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildOperationalInsight,
  type CurrentMetric,
  type MetricPoint,
  type OperationalInsight,
} from '../aggregators/operationalInsightAggregator';

/** 无 DB 演示模式：返回样例洞察卡片，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 洞察卡片行（与 medmuse.operational_insight 字段对齐） */
interface InsightRow {
  id: string;
  insightDate: string;
  metricName: string;
  currentValue: number;
  expectedValue: number;
  deviationPct: number;
  aiAnalysis: string;
  suggestedAction: string;
  acknowledgedAt: string | null;
}

function mapRow(r: Record<string, unknown>): InsightRow {
  return {
    id: r.id as string,
    insightDate: r.insight_date as string,
    metricName: r.metric_name as string,
    currentValue: Number(r.current_value),
    expectedValue: Number(r.expected_value),
    deviationPct: Number(r.deviation_pct),
    aiAnalysis: r.ai_analysis as string,
    suggestedAction: r.suggested_action as string,
    acknowledgedAt: (r.acknowledged_at as string | null) ?? null,
  };
}

/**
 * 汇总 GET /operational-insights：从 DB 读未确认洞察卡片。
 */
async function buildInsightsView(): Promise<unknown> {
  const db = getDb();
  const rows = await db`
    SELECT id, insight_date, metric_name, current_value, expected_value,
           deviation_pct, ai_analysis, suggested_action, acknowledged_at
    FROM medmuse.operational_insight
    WHERE acknowledged_at IS NULL
    ORDER BY insight_date DESC, metric_name
    LIMIT 50
  `;
  const cards = (rows as Array<Record<string, unknown>>).map(mapRow);
  return { cards, total: cards.length };
}

/**
 * 演示模式样例：用聚合器在样例序列上现场产出洞察卡片，便于无库联调。
 * 门诊量历史：工作日高、周末低，当前日一个尖峰触发 2σ 异常卡片。
 */
function demoView(): unknown {
  const history: MetricPoint[] = [
    { date: '2026-10-05', value: 1020 }, // 周一
    { date: '2026-10-06', value: 1050 },
    { date: '2026-10-07', value: 990 },
    { date: '2026-10-08', value: 1030 },
    { date: '2026-10-09', value: 1010 },
    { date: '2026-10-10', value: 640 }, // 周六
    { date: '2026-10-11', value: 610 }, // 周日
    { date: '2026-10-12', value: 1040 },
    { date: '2026-10-13', value: 1060 },
    { date: '2026-10-14', value: 1000 },
  ];
  const current: CurrentMetric = { metricName: 'outpatient_visits', date: '2026-10-15', value: 1680 };
  const insights: OperationalInsight[] = buildOperationalInsight(history, current);
  return { cards: insights, total: insights.length };
}

export const operationalInsightRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/dashboard/operational-insights',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;
      try {
        const view = isDemo ? demoView() : await buildInsightsView();
        return json(ok(view));
      } catch (err) {
        console.error(`[operationalInsight] GET /operational-insights [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '运营洞察加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
