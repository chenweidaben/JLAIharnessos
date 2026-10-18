/**
 * 健澜科技 jlmedaios - 质控科室预警阈值 V14 路由（M495-B）
 *
 * GET /api/v1/emr-qc-alert-threshold  （read，auth:true）返回阈值配置
 * POST /api/v1/emr-qc-alert-threshold/check  （auth:true，body 用 await c.req.json()）执行阈值检查
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAlertThreshold, checkAlertThreshold } from "../aggregators/emrQcAlertThresholdV14Aggregator.js";

const sampleThresholds = [
  buildAlertThreshold("内科", "缺陷率", 5),
  buildAlertThreshold("外科", "超时率", 10),
  buildAlertThreshold("儿科", "缺陷率", 3),
];

export const emrQcAlertThresholdV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-alert-threshold",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-alert-threshold:read");
      if (denied) return denied;
      return json(ok({ thresholds: sampleThresholds }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-alert-threshold/check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-alert-threshold:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        dept?: string;
        metric?: string;
        actual?: number;
        threshold?: number;
      };
      const result = checkAlertThreshold(
        body.dept ?? "",
        body.metric ?? "",
        body.actual ?? 0,
        body.threshold ?? 0,
      );
      return json(ok({ result }));
    },
  },
];
