/**
 * 健澜科技 jlmedaios - AI 医院大脑深化 BFF 路由（M159-A，中期路线图）
 *
 * GET /api/v1/ai-brain/deep
 *  - 在实时大屏（/ai-brain/realtime）之上做「真智能」深化分析：
 *      智能预警（异常指标自动发现 + 根因候选）
 *      决策建议（如「床位紧张，建议开放加床」）
 *      趋势预测（未来 7 天门诊量 / 床位使用率 / 手术量）
 *      根因分析（如「门诊量下降原因：周边新医院开业形成患者分流」）
 *  - 分析逻辑全部下沉到纯函数 deepHospitalBrain / generateBrainAlert /
 *    generateBrainRecommendation（不读库、不写 SQL、不触碰 WebSocket），
 *    本路由只做鉴权与数据装配；当前为演示模式（demo=true）。
 *
 * 医疗安全：登录即可读（auth=true），只读、无写副作用；
 *   仅院区级聚合，不含患者 PII；预警与建议为辅助决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  buildDeepDemo,
  buildExpandedDemo,
  correlateMetrics,
  deepHospitalBrain,
  expandHospitalBrain,
  generateBrainInsight,
  predictMetricTrend,
  type DeepBrain,
} from '../aggregators/brainDeepAggregator.js';

/**
 * GET /api/v1/ai-brain/deep
 * AI 医院大脑深化：智能预警 + 决策建议 + 7 天趋势预测 + 根因分析。
 */
async function handleBrainDeep(c: Ctx): Promise<Response> {
  try {
    // 1) 演示模式：构造 14 天历史 + 今日指标（纯函数、确定性）
    const { metrics, history } = buildDeepDemo();

    // 2) 纯函数总装：异常发现 + 建议 + 预测 + 根因
    const brain: DeepBrain = deepHospitalBrain(metrics, history);

    return json(
      ok({
        ...brain,
        // 页面角标：高严重度预警数 / 高优先级建议数
        highAlertCount: brain.alerts.filter((a) => a.severity === 'high').length,
        highRecommendationCount: brain.recommendations.filter((r) => r.priority === 'high').length,
        // 前端须显式标注「演示数据」
        notice: '演示数据，仅供深化分析演示与科研建模，不代表真实运行数据',
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 医院大脑深化分析失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

/**
 * M170-C：GET /api/v1/ai-brain/expand
 * AI 医院大脑深化扩展：四大维度评分（医疗质量/运营效率/患者体验/财务健康）
 *   + 单指标趋势预测（未来 7 天）+ 跨指标关联分析 + 可执行大脑洞察。
 * 纯函数全部下沉到 brainDeepAggregator（expandHospitalBrain / predictMetricTrend /
 * correlateMetrics / generateBrainInsight），本路由只做数据装配。
 * 【自学习与数字孪生】：演示模式，无新表、无 SQL、无 WebSocket。
 */
async function handleBrainExpand(c: Ctx): Promise<Response> {
  try {
    const { metrics, history } = buildExpandedDemo();

    // 1) 四大维度扩展评分
    const expanded = expandHospitalBrain(metrics);

    // 2) 关键指标未来 7 天趋势预测
    const forecasts = [
      predictMetricTrend('avgLOS', history.avgLOS ?? [], 7),
      predictMetricTrend('bedTurnover', history.bedTurnover ?? [], 7),
      predictMetricTrend('satisfaction', history.satisfaction ?? [], 7),
      predictMetricTrend('drgSurplusWan', history.drgSurplusWan ?? [], 7),
    ];

    // 3) 跨指标关联分析（最近 14 天窗口）
    const correlations = correlateMetrics(history, 14);

    // 4) 可执行洞察（动作 + 量化收益，不是「建议关注」）
    const insights = generateBrainInsight(metrics, correlations);

    return json(
      ok({
        ...expanded,
        forecasts,
        correlations,
        insights,
        raw: metrics,
        highInsightCount: insights.filter((i) => i.priority === 'high').length,
        notice: '演示数据，自学习与数字孪生建模，不代表真实运行数据',
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 医院大脑扩展分析失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const brainDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/ai-brain/deep',
    auth: true,
    handle: handleBrainDeep,
  },
  {
    method: 'GET',
    path: '/api/v1/ai-brain/expand',
    auth: true,
    handle: handleBrainExpand,
  },
];
