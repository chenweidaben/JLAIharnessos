/**
 * 健澜科技 jlmedaios - 质控指标计算 V14 路由（M483-B）
 *
 * POST /api/v1/emr-qc-metric-calc  （auth:true，body 用 await c.req.json()）执行指标计算
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { calcQcMetric, aggregateQcMetrics } from "../aggregators/emrQcMetricCalcV14Aggregator.js";

export const emrQcMetricCalcV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-metric-calc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-metric-calc:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        name?: string;
        numerator?: number;
        denominator?: number;
        metrics?: { name: string; value: number }[];
      };
      const result = calcQcMetric(
        body.name ?? "完整率",
        body.numerator ?? 950,
        body.denominator ?? 1000,
      );
      const aggregate = body.metrics ? aggregateQcMetrics(body.metrics) : undefined;
      return json(ok({ result, aggregate }));
    },
  },
];
