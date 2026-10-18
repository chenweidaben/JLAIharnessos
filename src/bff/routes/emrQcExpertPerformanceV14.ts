/**
 * 健澜科技 jlmedaios - 质控专家绩效统计 V14 路由（M502-D，M502 收官）
 *
 * GET /api/v1/emr-qc-expert-performance  （read，auth:true）返回专家绩效统计
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateExpertPerformance, buildExpertPerformance, type ExpertPerformanceV14 } from "../aggregators/emrQcExpertPerformanceV14Aggregator.js";

const samplePerf: ExpertPerformanceV14[] = [
  buildExpertPerformance("张教授", 15, 92.5),
  buildExpertPerformance("李教授", 10, 88.0),
  buildExpertPerformance("王教授", 8, 85.5),
];

const aggregate = aggregateExpertPerformance(samplePerf);

export const emrQcExpertPerformanceV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-expert-performance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-expert-performance:read");
      if (denied) return denied;
      return json(ok({ perf: samplePerf, aggregate }));
    },
  },
];
