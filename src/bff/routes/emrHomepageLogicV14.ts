/**
 * 健澜科技 jlmedaios - 病案首页逻辑校验 V14 路由（M535-B）
 *
 * GET  /api/v1/emr-homepage-logic  （read，auth:true）返回首页逻辑校验基础数据
 * POST /api/v1/emr-homepage-logic  （auth:true）首页逻辑校验 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildHomepageLogic,
  buildHomepageLogicReport,
  checkHomepageLogic,
  type HomepageLogicInputV14,
} from "../aggregators/emrHomepageLogicV14Aggregator.js";

export const emrHomepageLogicV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-homepage-logic",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-homepage-logic:read");
      if (denied) return denied;
      const logic = buildHomepageLogic("REC201", "普外科");
      return json(ok(logic));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-homepage-logic",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-homepage-logic:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: HomepageLogicInputV14 = {
        admissionDays: Number(obj?.admissionDays ?? 0),
        age: Number(obj?.age ?? 0),
        hasSurgery: Boolean(obj?.hasSurgery ?? false),
      };
      const result = checkHomepageLogic(input);
      const report = buildHomepageLogicReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
