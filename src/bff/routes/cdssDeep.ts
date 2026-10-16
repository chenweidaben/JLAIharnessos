/**
 * 健澜科技 jlmedaios - CDSS 临床决策支持深化 · BFF 路由（M165-A）
 *
 * 「CDSS与运营精细化」——CDSS 告警不能太多，否则医生会忽略（告警疲劳）。
 *
 *   POST /api/v1/cdss/evaluate
 *     Body：{ patientContext, orderContext }
 *     流程：buildCDSSEngine 装配适用规则 → evaluateCDSSRules 求值 →
 *           prioritizeCDSSAlerts 排序合并 + 超量压制 → 仅返回真正该弹窗的告警。
 *
 * 数据来源：aggregators/cdssDeepAggregator.ts（纯函数派生，进程内规则目录）。
 * 不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildCDSSEngine,
  CDSSEngineError,
  evaluateCDSSRules,
  prioritizeCDSSAlerts,
  type CDSSOrderContext,
  type CDSSPatientContext,
} from '../aggregators/cdssDeepAggregator';

/** POST 入参（宽松解析，非法字段在下方逐字段校验） */
interface EvaluateBody {
  patientContext?: unknown;
  orderContext?: unknown;
}

function mapError(err: unknown, traceId: string): Response {
  if (err instanceof CDSSEngineError) {
    const code = err.status === 400 ? ErrorCode.BAD_REQUEST : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message, traceId), err.status);
  }
  const message = err instanceof Error ? err.message : 'CDSS 求值失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message, traceId), 500);
}

export const cdssDeepRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/cdss/evaluate',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: EvaluateBody;
      try {
        body = (await c.body()) as EvaluateBody;
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
      }

      const patientContext = body.patientContext as CDSSPatientContext | undefined;
      if (!patientContext || typeof patientContext !== 'object') {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 patientContext', c.traceId), 400);
      }
      const orderContext: CDSSOrderContext =
        body.orderContext && typeof body.orderContext === 'object'
          ? (body.orderContext as CDSSOrderContext)
          : { orders: [] };

      try {
        // 1) 装配引擎：按上下文裁剪适用规则集
        const engine = buildCDSSEngine(patientContext, orderContext);
        // 2) 规则求值：产出原始告警
        const rawAlerts = evaluateCDSSRules(patientContext, engine.applicableRules, orderContext);
        // 3) 优先级排序 + 同优先级去重合并 + 超量压制（防告警疲劳）
        const bundle = prioritizeCDSSAlerts(rawAlerts);

        return json(
          ok({
            patientId: engine.patientId,
            facts: engine.facts,
            applicableRuleCount: engine.applicableRules.length,
            rawAlertCount: rawAlerts.length,
            alerts: bundle.alerts,
            suppressedCount: bundle.suppressedCount,
            byPriority: bundle.byPriority,
          }),
        );
      } catch (err) {
        return mapError(err, c.traceId);
      }
    },
  },
];
