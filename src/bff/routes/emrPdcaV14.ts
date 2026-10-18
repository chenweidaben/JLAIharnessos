/**
 * 健澜科技 jlmedaios - 病历质控 PDCA 循环管理 V14 路由（M468-D，M468 收官）
 *
 * GET  /api/v1/emr-pdca  （read，auth:true）返回 PDCA 计划列表
 * POST /api/v1/emr-pdca  （auth:true，body 用 await c.req.json()）创建计划
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  advancePdcaStage,
  buildPdcaPlan,
  type PdcaPlanV14,
} from "../aggregators/emrPdcaV14Aggregator.js";

const demoPlans: PdcaPlanV14[] = [
  { id: "PDCA-001", title: "降低甲级病历缺陷率", description: "通过规则引擎前置拦截", stage: "plan" },
  { id: "PDCA-002", title: "提高病历书写时效", description: "SLA 实时预警+科室督促", stage: "do" },
];

export const emrPdcaV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-pdca",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-pdca:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({ plans: demoPlans }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-pdca",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-pdca:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { title?: string; description?: string; advanceId?: string };
      if (body.advanceId) {
        const target = demoPlans.find((p) => p.id === body.advanceId);
        if (target) {
          const advanced = advancePdcaStage(target);
          return json(ok({ plan: advanced }));
        }
      }
      const plan = buildPdcaPlan(body.title ?? "新计划", body.description ?? "");
      return json(ok({ plan }));
    },
  },
];
