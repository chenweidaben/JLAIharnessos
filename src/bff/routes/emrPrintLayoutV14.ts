/**
 * 健澜科技 jlmedaios - 病历打印版式与套打 V14 路由（M466-A）
 *
 * GET  /api/v1/emr-print-layout/:templateId （read，auth:true，path 参数 c.params.templateId）返回版式
 * POST /api/v1/emr-print-layout/render       （auth:true，body 用 await c.req.json()）套打渲染
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPrintLayout,
  renderPrintFields,
} from "../aggregators/emrPrintLayoutV14Aggregator.js";

export const emrPrintLayoutV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-print-layout/:templateId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-print-layout:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const templateId = (c.params.templateId ?? "").trim();
      const layout = buildPrintLayout(templateId);
      return json(ok({ templateId, layout }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-print-layout/render",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-print-layout:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        templateId?: string;
        data?: Record<string, string>;
      };
      const layout = buildPrintLayout(body.templateId ?? "default");
      const rendered = renderPrintFields(layout, body.data ?? {});
      return json(ok({ layout, rendered }));
    },
  },
];
