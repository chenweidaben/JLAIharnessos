/**
 * 健澜科技 jlmedaios - AI 大脑 2.0 门诊试点 BFF 路由（M182-C，v5.0启动）
 *
 * GET /api/v1/ai-brain/v2/outpatient
 *  - 门诊试点实时监控：门诊量 / 医生负荷 / 候诊预警 + 高峰预测 + 优化建议；
 *  - 「实时，不能静态」：前端定时轮询本接口，每次轮询 buildAIBrainV2Outpatient
 *    按当前分钟桶生成带轻微漂移的演示计数；不触碰 WebSocket（红线）；
 *  - 聚合 / 预测 / 建议全部下沉到纯函数，本路由只做鉴权与数据装配。
 *
 * 医疗安全：登录即可读（auth=true），只读、无写副作用；
 *   仅返回科室 / 诊室聚合计数，不含患者 PII；AI 建议为辅助决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  buildAIBrainV2Outpatient,
  predictOutpatientPeak,
  suggestOutpatientOptimization,
  type AIBrainV2Outpatient,
  type OutpatientPeakForecast,
  type OutpatientSuggestion,
} from '../aggregators/aiBrainV2OutpatientAggregator.js';

/**
 * GET /api/v1/ai-brain/v2/outpatient
 * AI 大脑 2.0 门诊试点：实时监控 + 高峰预测 + 优化建议（演示模式）。
 */
async function handleAIBrainV2Outpatient(c: Ctx): Promise<Response> {
  try {
    // 1) 聚合门诊实时指标（演示模式，按当前分钟桶漂移）
    const snapshot: AIBrainV2Outpatient = buildAIBrainV2Outpatient();

    // 2) 今日高峰预测
    const forecast: OutpatientPeakForecast = predictOutpatientPeak('today');

    // 3) 基于实时指标阈值生成优化建议
    const suggestions: OutpatientSuggestion[] = suggestOutpatientOptimization(snapshot);

    return json(
      ok({
        ...snapshot,
        forecast,
        suggestions,
        // 前端须显式标注「演示数据」
        notice: '演示数据，仅用于门诊试点演示与科研建模，不代表真实运行数据',
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 大脑 2.0 门诊试点聚合失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const aiBrainV2OutpatientRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/ai-brain/v2/outpatient',
    auth: true,
    handle: handleAIBrainV2Outpatient,
  },
];
