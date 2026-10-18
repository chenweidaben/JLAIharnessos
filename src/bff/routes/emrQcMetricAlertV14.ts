/**
 * 健澜科技 jlmedaios - 质控指标预警 V14 路由（M483-C）
 *
 * GET /api/v1/emr-qc-metric-alert  （read，auth:true，query 用 new URL 取 metric）返回预警列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAlertRule, checkMetricAlert, type AlertRuleV14 } from "../aggregators/emrQcMetricAlertV14Aggregator.js";

const demoRules: AlertRuleV14[] = [
  buildAlertRule("完整率", 90, "below"),
  buildAlertRule("缺陷率", 5, "above"),
  buildAlertRule("及时率", 95, "below"),
];

export const emrQcMetricAlertV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-metric-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-metric-alert:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const metric = url.searchParams.get("metric");
      const rules = metric ? demoRules.filter((r) => r.metricName === metric) : demoRules;
      const results = rules.map((r) => ({
        rule: r,
        trigger: checkMetricAlert(r, r.direction === "below" ? 85 : 8),
      }));
      return json(ok({ rules, results }));
    },
  },
];
