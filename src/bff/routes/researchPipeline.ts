/**
 * 健澜科技 jlmedaios - 【科研教学后勤】医院科研智能化深化·全流程辅助路由（M171-A）
 *
 * POST /api/v1/research/full-pipeline
 *   body: {
 *     topic: string;                  // 必填：研究主题
 *     alpha?: number;                 // 可选：检验水准（默认 0.05）
 *     power?: number;                 // 可选：把握度（默认 0.8）
 *     effectSize?: number;            // 可选：Cohen's d（默认 0.5）
 *     studyDesign?: string;           // 可选：研究设计（同传则回统计推荐 + 偏倚识别）
 *     dataType?: string;              // 可选：结局数据类型（与 studyDesign 同传）
 *   }
 *
 * 行为：
 *   - topic 必填，非法 400；
 *   - 必返七步全流程 buildFullResearchPipeline(topic)；
 *   - 同传 alpha/power/effectSize → 附带 estimateSampleSize；
 *   - 同传 studyDesign（+ dataType，缺省 continuous）→ 附带
 *     recommendStatisticalMethod 与 identifyBiasRisk；
 *   - 纯函数全程不触库、不预造数据。
 *
 * 鉴权：未登录 401。入参非法一律 400 结构化错误信封，不抛 500。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildFullResearchPipeline,
  estimateSampleSize,
  identifyBiasRisk,
  recommendStatisticalMethod,
} from '../aggregators/researchPipelineAggregator';

export const researchPipelineRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/research/full-pipeline',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: {
        topic?: unknown;
        alpha?: unknown;
        power?: unknown;
        effectSize?: unknown;
        studyDesign?: unknown;
        dataType?: unknown;
      };
      try {
        body = await c.body();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
      }

      try {
        // 必返：七步全流程
        const pipeline = buildFullResearchPipeline(body.topic);
        const payload: Record<string, unknown> = { pipeline };

        // 可选：样本量估算（三项任一提供则按给定值/缺省值完整估算）
        if (
          body.alpha != null ||
          body.power != null ||
          body.effectSize != null
        ) {
          payload.sampleSize = estimateSampleSize(
            body.alpha ?? 0.05,
            body.power ?? 0.8,
            body.effectSize ?? 0.5,
          );
        }

        // 可选：研究设计 → 统计方法推荐 + 偏倚风险识别
        if (body.studyDesign != null && String(body.studyDesign).trim()) {
          payload.statRecommendation = recommendStatisticalMethod(
            body.studyDesign,
            body.dataType ?? 'continuous',
          );
          payload.biasRisk = identifyBiasRisk(body.studyDesign);
        }

        return json(ok(payload, '科研全流程辅助已生成（纯函数，未预造数据）'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '科研全流程辅助生成失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
