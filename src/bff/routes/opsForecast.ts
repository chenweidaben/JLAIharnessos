/**
 * 健澜科技 jlmedaios — 【AI深化与运营预测】医院运营智能预测路由（M154-C）
 *
 *   GET /api/v1/admin/forecast?days=7
 *     从临床库拉取逐日历史序列（门诊量 / 床位负荷 / 手术量），交由纯函数
 *     聚合器（aggregators/opsForecastAggregator.ts）产出未来 N 天预测，
 *     含基于历史残差的 95% 置信区间；最近一批预测 upsert 落库 medmuse.ops_forecast。
 *
 * 降级原则：某指标历史样本不足（<14 天）时该指标返回 degraded 空集，不编造数字；
 *           演示模式（DEMO_MODE）不连 PostgreSQL，一律返回空集。
 * 医疗安全红线：预测仅为运营排班/物资准备辅助参考，不触发诊疗行为、不直接调号源/床位。
 * 权限码：medmuse:view（admin/运营岗只读）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  forecastBedOccupancy,
  forecastOutpatientVolume,
  forecastSurgeryVolume,
  type ForecastResult,
  type HistoryPoint,
} from '../aggregators/opsForecastAggregator';

/** 无 DB 演示模式：不连 PostgreSQL，不伪造业务数字 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 默认/最大预测天数 */
const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;
/** 历史回看窗口（天）：至少覆盖 14 天最小拟合样本 */
const LOOKBACK_DAYS = 90;

function mapPoint(r: Record<string, unknown>): HistoryPoint {
  return { date: String(r.d).slice(0, 10), value: Number(r.c) };
}

/** 门诊量：按日统计门诊/急诊就诊人次 */
async function loadOutpatientHistory(): Promise<HistoryPoint[]> {
  const db = getDb();
  const rows = await db`
    SELECT created_at::date AS d, count(*)::int AS c
    FROM clinical.visits
    WHERE visit_type IN ('outpatient','emergency')
      AND created_at >= now() - interval '${LOOKBACK_DAYS} days'
    GROUP BY 1 ORDER BY 1
  `;
  return (rows as Array<Record<string, unknown>>).map(mapPoint);
}

/** 床位负荷：按日统计当日入院在院（住院）人次 */
async function loadBedHistory(): Promise<HistoryPoint[]> {
  const db = getDb();
  const rows = await db`
    SELECT admit_at::date AS d, count(*)::int AS c
    FROM clinical.visits
    WHERE visit_type = 'inpatient'
      AND admit_at IS NOT NULL
      AND admit_at >= now() - interval '${LOOKBACK_DAYS} days'
    GROUP BY 1 ORDER BY 1
  `;
  return (rows as Array<Record<string, unknown>>).map(mapPoint);
}

/** 手术量：按日统计已排手术台次（取消不计） */
async function loadSurgeryHistory(): Promise<HistoryPoint[]> {
  const db = getDb();
  const rows = await db`
    SELECT schedule_date AS d, count(*)::int AS c
    FROM clinical.surgery_schedule
    WHERE status <> 'cancelled'
      AND schedule_date >= now() - interval '${LOOKBACK_DAYS} days'
    GROUP BY 1 ORDER BY 1
  `;
  return (rows as Array<Record<string, unknown>>).map(mapPoint);
}

/** 最近一批预测 upsert 落库（按 metric_name + forecast_date 覆盖写） */
async function persistForecast(result: ForecastResult): Promise<void> {
  if (result.degraded || result.forecast.length === 0) return;
  const db = getDb();
  for (const p of result.forecast) {
    await db`
      INSERT INTO medmuse.ops_forecast
        (forecast_date, metric_name, predicted_value, lower_bound, upper_bound,
         residual_std, confidence_level, history_points, model_method)
      VALUES (${p.date}, ${result.metric}, ${p.value}, ${p.lower}, ${p.upper},
              ${result.residualStd}, ${result.confidenceLevel}, ${result.historyPoints}, ${result.modelMethod})
      ON CONFLICT (metric_name, forecast_date) DO UPDATE SET
        predicted_value = EXCLUDED.predicted_value,
        lower_bound     = EXCLUDED.lower_bound,
        upper_bound     = EXCLUDED.upper_bound,
        residual_std    = EXCLUDED.residual_std,
        history_points  = EXCLUDED.history_points,
        created_at      = now()
    `;
  }
}

function degradedResult(metric: string): ForecastResult {
  return {
    metric,
    historyStart: null,
    historyEnd: null,
    historyPoints: 0,
    forecast: [],
    residualStd: 0,
    confidenceLevel: 0.95,
    modelMethod: 'ma7+seasonal7d+lin_trend',
    degraded: true,
  };
}

export const opsForecastRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/forecast',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;

      const days = Math.min(
        MAX_DAYS,
        Math.max(1, Number(c.query.get('days') ?? DEFAULT_DAYS) || DEFAULT_DAYS),
      );

      // 演示模式：不连库、不编造，返回空集
      if (isDemo) {
        return json(
          ok({
            days,
            generatedAt: new Date().toISOString(),
            demo: true,
            outpatient: degradedResult('outpatient_volume'),
            bed: degradedResult('bed_occupancy'),
            surgery: degradedResult('surgery_volume'),
          }),
        );
      }

      try {
        const [opHist, bedHist, surgHist] = await Promise.all([
          loadOutpatientHistory().catch(() => [] as HistoryPoint[]),
          loadBedHistory().catch(() => [] as HistoryPoint[]),
          loadSurgeryHistory().catch(() => [] as HistoryPoint[]),
        ]);

        const outpatient = forecastOutpatientVolume(opHist, days);
        const bed = forecastBedOccupancy(bedHist, days);
        const surgery = forecastSurgeryVolume(surgHist, days);

        // 落库最近一批（失败不阻断返回，预测本身已在内存产出）
        await Promise.all([
          persistForecast(outpatient).catch(() => undefined),
          persistForecast(bed).catch(() => undefined),
          persistForecast(surgery).catch(() => undefined),
        ]);

        return json(
          ok({
            days,
            generatedAt: new Date().toISOString(),
            demo: false,
            outpatient,
            bed,
            surgery,
          }),
        );
      } catch (err) {
        console.error(`[opsForecast] GET /admin/forecast [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '运营预测加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
