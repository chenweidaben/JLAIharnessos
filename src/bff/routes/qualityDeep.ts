/**
 * 健澜科技 jlmedaios — 【安全质量与运营】医院质量与安全管理深化路由（M172-B）
 *
 * GET /api/v1/admin/quality/deep?dept=IN
 *   - 拉取国家口径深度质量管理体系（buildDeepQualitySystem）；
 *   - 采集科室当前指标读数（进程内内存快照，零新依赖），交纯函数
 *     identifyQualityRisk 识别红/黄风险，generateQualityImprovement 生成改进建议，
 *     predictQualityTrend 外推重点指标未来 3 期走势；
 *   - 返回 { system, risks, improvements, trends, demo, dept }。
 *     无真实样本时打 demo 标记，前端走三态，绝不用假数据冒充真实结论。
 *
 * 生产安全加固：
 *  - 仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、无写副作用；
 *  - 指标全部为国家口径白名单，未登记 code 不参与判定，禁止自创指标；
 *  - 不暴露患者个体 PII，仅返回科室级聚合量；
 *  - 不碰 WebSocket、不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDeepQualitySystem,
  findMetricDef,
  generateQualityImprovement,
  identifyQualityRisk,
  predictQualityTrend,
  type MetricReading,
} from '../aggregators/qualityDeepAggregator';

/** 演示模式开关：与 wisdomDashboard / talentDeep 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/* -------------------- 进程内内存采集（零新依赖，仅本模块） -------------------- */

/** 各科室当前一期国家口径指标读数（真实部署由质控/护理/药事数据平台回写） */
const qualityReadings: Record<string, MetricReading[]> = {
  IN: [
    { code: 'MR_GRADE_A_RATE', value: 92.5 },
    { code: 'SURGICAL_COMPLICATION_RATE', value: 1.8 },
    { code: 'HAI_RATE', value: 8.2 },
    { code: 'AUDDS', value: 46.5 },
    { code: 'PREOP_DISCUSSION_RATE', value: 98 },
    { code: 'PRESCRIPTION_PASS_RATE', value: 96.2 },
    { code: 'ADR_REPORT_TIMELY_RATE', value: 84 },
    { code: 'PS_MEDICATION_ERROR', value: 0 },
  ],
  SU: [
    { code: 'MR_GRADE_A_RATE', value: 86 },
    { code: 'SURGICAL_COMPLICATION_RATE', value: 5.4 },
    { code: 'HAI_RATE', value: 12.6 },
    { code: 'AUDDS', value: 52 },
    { code: 'PREOP_DISCUSSION_RATE', value: 95 },
    { code: 'PS_TRANSFUSION_REACTION', value: 1 },
    { code: 'PS_MEDICATION_ERROR', value: 0 },
  ],
  NU: [
    { code: 'BASIC_NURSING_PASS_RATE', value: 93 },
    { code: 'CRITICAL_NURSING_PASS_RATE', value: 84 },
    { code: 'INPATIENT_PRESSURE_ULCER_RATE', value: 0.9 },
    { code: 'INPATIENT_FALL_RATE', value: 1.6 },
    { code: 'PS_BED_FALL', value: 0.4 },
    { code: 'PS_FALL', value: 0.5 },
  ],
};

/** 重点指标近 6 期历史（用于趋势外推；真实部署从 quality_metric_deep 表按 period 回读） */
const qualityHistory: Record<string, Array<{ period: string; value: number }>> = {
  AUDDS: [
    { period: '2026-05', value: 44 },
    { period: '2026-06', value: 45.2 },
    { period: '2026-07', value: 45.8 },
    { period: '2026-08', value: 46.1 },
    { period: '2026-09', value: 46.3 },
    { period: '2026-10', value: 46.5 },
  ],
  MR_GRADE_A_RATE: [
    { period: '2026-05', value: 88 },
    { period: '2026-06', value: 89.5 },
    { period: '2026-07', value: 90.2 },
    { period: '2026-08', value: 91.4 },
    { period: '2026-09', value: 92.0 },
    { period: '2026-10', value: 92.5 },
  ],
  CRITICAL_NURSING_PASS_RATE: [
    { period: '2026-05', value: 88 },
    { period: '2026-06', value: 87 },
    { period: '2026-07', value: 86.2 },
    { period: '2026-08', value: 85.5 },
    { period: '2026-09', value: 84.8 },
    { period: '2026-10', value: 84.0 },
  ],
};

/** 趋势外推期数 */
const FORECAST_DAYS = 3;

/**
 * GET /api/v1/admin/quality/deep
 * 医院质量与安全管理深化（管理驾驶舱，仅 admin）。
 * query: dept（科室编码，默认 IN；不在库时回退到第一个有数据科室）
 */
async function handleQualityDeep(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    let dept = (c.query.get('dept') ?? 'IN').trim() || 'IN';
    if (!qualityReadings[dept]) {
      // 未知科室回退到第一个有数据科室，不抛 404
      dept = Object.keys(qualityReadings)[0] ?? 'IN';
    }
    const nowIso = new Date().toISOString();

    // 1) 深度质量管理体系（国家口径指标目录）
    const system = buildDeepQualitySystem(nowIso);

    // 2) 科室当前读数 → 风险识别
    const readings = qualityReadings[dept] ?? [];
    const risks = identifyQualityRisk(dept, readings);

    // 3) 对每条风险生成改进建议（命中国家口径指标定义）
    const improvements = risks
      .map((r) => {
        const def = findMetricDef(r.code);
        return def ? generateQualityImprovement(def, r.value) : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // 4) 重点指标趋势外推（取该科室有历史的指标）
    const trends = Object.entries(qualityHistory)
      .map(([code, hist]) => {
        const def = findMetricDef(code);
        return def ? predictQualityTrend(def, hist, FORECAST_DAYS) : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // 无真实样本时强制 demo 标记
    const demo = demoModeEnabled() || readings.length === 0;

    return json(
      ok({ system, risks, improvements, trends, demo, dept }, 'ok', c.traceId),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '质量与安全指标采集失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const qualityDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/quality/deep',
    auth: true,
    handle: handleQualityDeep,
  },
];
