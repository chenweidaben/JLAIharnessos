/**
 * 健澜科技 jlmedaios - 质控规则版本管理 V14 路由（M519-B）
 *
 * GET  /api/v1/emr-qc-rule-version  （read，auth:true）返回规则版本基础数据
 * POST /api/v1/emr-qc-rule-version  （auth:true）对比规则版本 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRuleVersion,
  buildRuleVersionReport,
  compareRuleVersions,
  type RuleVersionCompareV14,
} from "../aggregators/emrQcRuleVersionV14Aggregator.js";

export const emrQcRuleVersionV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-rule-version",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rule-version:read");
      if (denied) return denied;
      const version = buildRuleVersion("病程记录及时性", "v2.1.0", "阈值从24h改为12h");
      return json(ok(version));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-rule-version",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rule-version:write");
      if (denied) return denied;
      const body = await c.req.json();
      const oldVersion: RuleVersionCompareV14 = {
        threshold: Number(body?.oldVersion?.threshold ?? 0),
        enabled: Boolean(body?.oldVersion?.enabled),
      };
      const newVersion: RuleVersionCompareV14 = {
        threshold: Number(body?.newVersion?.threshold ?? 0),
        enabled: Boolean(body?.newVersion?.enabled),
      };
      const result = compareRuleVersions(oldVersion, newVersion);
      const report = buildRuleVersionReport(result);
      return json(ok({ oldVersion, newVersion, result, report }));
    },
  },
];
