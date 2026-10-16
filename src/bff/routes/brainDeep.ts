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
  deepHospitalBrain,
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

export const brainDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/ai-brain/deep',
    auth: true,
    handle: handleBrainDeep,
  },
];
