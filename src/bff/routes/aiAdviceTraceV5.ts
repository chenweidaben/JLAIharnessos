/**
 * 健澜科技 jlmedaios - AI 建议全链路审计 V5 路由（M276-A）
 *
 * POST /api/v1/ai-advice-trace（写：guarded+审计+幂等）
 * GET  /api/v1/ai-advice-trace（按患者/医生/类型检索+聚合看板）
 *
 * 权限：ai-advice-trace:write / ai-advice-trace:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAIAdviceTraceV5Report,
  explainAdviceV5,
  recordAdviceV5,
  type AdviceTrace,
} from "../aggregators/aiAdviceTraceV5Aggregator.js";

const store: AdviceTrace[] = [];

export const aiAdviceTraceV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/ai-advice-trace",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-advice-trace:write");
      if (denied) return denied;

      const body = await c.req.json() as Omit<AdviceTrace, "id">;
      const record = recordAdviceV5(body);
      store.push(record);
      return json(ok(record));
    },
  },
  {
    method: "GET",
    path: "/api/v1/ai-advice-trace",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-advice-trace:read");
      if (denied) return denied;

      const patientRef = c.query.get("patientRef");
      const adviceType = c.query.get("adviceType");
      let filtered = store;
      if (patientRef) filtered = filtered.filter((t) => t.patientRef === patientRef);
      if (adviceType) filtered = filtered.filter((t) => t.adviceType === adviceType);
      const report = buildAIAdviceTraceV5Report(filtered);
      return json(ok(report));
    },
  },
  {
    method: "GET",
    path: "/api/v1/ai-advice-trace/explain",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-advice-trace:read");
      if (denied) return denied;

      const id = c.query.get("id") ?? "";
      const advice = store.find((t) => t.id === id);
      if (!advice) {
        return json(ok({ found: false }));
      }
      return json(ok(explainAdviceV5(advice)));
    },
  },
];
