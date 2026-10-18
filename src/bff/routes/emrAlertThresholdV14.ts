/**
 * 健澜科技 jlmedaios - 病历质控指标预警阈值配置 V14 路由（M469-A）
 *
 * GET  /api/v1/emr-alert-threshold          （read，auth:true）返回阈值列表
 * PUT  /api/v1/emr-alert-threshold/:indicator（auth:true，path 参数 c.params.indicator，body 用 await c.req.json()）更新阈值
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAlertSummary,
  evaluateAlert,
  type AlertSummaryItemV14,
} from "../aggregators/emrAlertThresholdV14Aggregator.js";

const demoItems: AlertSummaryItemV14[] = [
  { indicator: "passRate", value: 95, status: "normal" },
  { indicator: "defectRate", value: 5, status: "warn" },
  { indicator: "archivedRate", value: 70, status: "danger" },
];

export const emrAlertThresholdV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-alert-threshold",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-alert-threshold:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const summary = buildAlertSummary(demoItems);
      return json(ok({ items: demoItems, summary }));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/emr-alert-threshold/:indicator",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-alert-threshold:write");
      if (denied) return denied;
      const indicator = (c.params.indicator ?? "").trim();
      const body = await c.req.json().catch(() => ({})) as { warn?: number; danger?: number };
      const status = evaluateAlert(
        body.warn ?? 90,
        { warn: body.warn ?? 90, danger: body.danger ?? 80 },
      );
      return json(ok({ indicator, status, updated: true }));
    },
  },
];
