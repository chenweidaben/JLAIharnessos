/**
 * 健澜科技 jlmedaios - AI 医院大脑深化：智能决策支持 BFF 路由（M164-B）
 *
 * POST /api/v1/ai-brain/decision
 *  - 对「门诊高峰 / 床位紧张 / 药品库存低 / 质控扣分多」四类场景，
 *    给出可落地的候选方案、加权排序、第一名推荐与 ROI 影响评估；
 *  - 【本切片边界】纯函数 + 路由 + 前端，不写 SQL、无新表、无写副作用；
 *    不传 body（或 demo=true）时返回确定性演示样本，由真实纯函数折算；
 *    真实接入后仅替换数据中台的上下文来源，纯函数签名不变。
 *
 * 医疗安全：登录即可读（auth=true），仅院级/科室级聚合，不含患者 PII；
 *   建议为辅助决策，最终由当班院领导 / 科主任本人确认执行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  buildAIDecisionSupport,
  buildDemoContext,
  monitorDecisionOutcome,
  type DecisionContext,
  type DecisionOutcomeReport,
} from '../aggregators/aiDecisionAggregator.js';

/** 请求体：可空，空则走演示样本 */
interface DecisionBody extends DecisionContext {
  demo?: boolean;
  /** 效果跟踪模式：带上 decisionId + outcome 时，返回闭环评估而非新决策 */
  track?: { decisionId: string; outcome: DecisionOutcomeReport };
}

/** POST /api/v1/ai-brain/decision */
async function handleAIDecision(c: Ctx): Promise<Response> {
  let body: DecisionBody | null = null;
  try {
    body = (await c.body()) as DecisionBody | null;
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
  }

  const input: DecisionBody = body ?? {};
  const demo = input.demo !== false; // 默认演示；显式 demo=false 才严格使用传入数据

  try {
    // 1) 效果跟踪闭环模式：上报实际结果，返回「预测 vs 实际」结论
    if (input.track) {
      const result = monitorDecisionOutcome(input.track.decisionId, input.track.outcome);
      return json(ok(result, '决策效果已闭环评估', c.traceId));
    }

    // 2) 智能决策生成：缺省字段用演示样本补齐
    const ctx: DecisionContext = { ...buildDemoContext(), ...input };
    const support = buildAIDecisionSupport(ctx);

    return json(
      ok(
        {
          ...support,
          demo,
        },
        'AI 智能决策方案已生成',
        c.traceId,
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 智能决策生成失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const aiDecisionRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai-brain/decision',
    auth: true,
    handle: handleAIDecision,
  },
];
