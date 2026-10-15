/**
 * 健澜科技 jlmedaios - AI 医院大脑实时大屏 BFF 路由（M156-B，集团与科研）
 *
 * GET /api/v1/ai-brain/realtime
 *  - 实时返回全院大脑大屏数据：门诊 / 住院 / 手术 / 预警四类指标 + AI 建议；
 *  - 「实时，不能静态」：前端定时轮询本接口，每次轮询 buildHospitalBrain
 *    按当前分钟桶生成带轻微漂移的演示计数，配合 generatedAt 形成活大屏；
 *    不触碰 WebSocket（任务红线）；
 *  - 指标聚合 / AI 建议生成全部下沉到纯函数 buildHospitalBrain /
 *    generateAIBrainSuggestion，本路由只做鉴权与数据装配；
 *  - 当前为演示模式（demo=true），后续平滑替换为 HIS / EMR / 手麻 / LIS
 *    实时聚合源，函数签名不变。
 *
 * 医疗安全：登录即可读（auth=true），只读、无写副作用；
 *   仅返回科室 / 院区聚合计数，不含患者 PII；AI 建议为辅助决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  buildHospitalBrain,
  generateAIBrainSuggestion,
  type BrainSuggestion,
  type HospitalBrain,
} from '../aggregators/aiBrainAggregator.js';

/**
 * GET /api/v1/ai-brain/realtime
 * AI 医院大脑实时大屏：四类实时指标 + AI 建议（演示模式）。
 */
async function handleAIBrainRealtime(c: Ctx): Promise<Response> {
  try {
    // 1) 聚合全院实时指标（演示模式，按当前分钟桶漂移）
    const brain: HospitalBrain = buildHospitalBrain();

    // 2) 基于实时指标阈值生成 AI 建议
    const suggestions: BrainSuggestion[] = generateAIBrainSuggestion(brain);

    // 高优先级建议计数（大屏角标用）
    const highCount = suggestions.filter((s) => s.priority === 'high').length;

    return json(
      ok({
        ...brain,
        // 大屏额外派生：预警总数 / 高优先级建议数
        warningTotal:
          brain.warnings.criticalValues +
          brain.warnings.infection +
          brain.warnings.drugStock +
          brain.warnings.equipmentFault,
        highSuggestionCount: highCount,
        suggestions,
        // 前端须显式标注「演示数据」
        notice: '演示数据，仅供大屏演示与科研建模，不代表真实运行数据',
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 医院大脑实时聚合失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const aiBrainRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/ai-brain/realtime',
    auth: true,
    handle: handleAIBrainRealtime,
  },
];
