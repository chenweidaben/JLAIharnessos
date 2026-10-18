/**
 * 健澜科技 jlmedaios - 质控规则对比分析 V14 路由（M519-D，M519 收官）
 *
 * GET  /api/v1/emr-qc-rule-compare  （read，auth:true）返回规则对比基础数据
 * POST /api/v1/emr-qc-rule-compare  （auth:true）对比两套规则集 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRuleCompare,
  buildRuleCompareReport,
  compareRuleSets,
  type RuleSetV14,
} from "../aggregators/emrQcRuleCompareV14Aggregator.js";

export const emrQcRuleCompareV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-rule-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rule-compare:read");
      if (denied) return denied;
      const compare = buildRuleCompare("心内科", "普外科", "病程记录及时性");
      return json(ok(compare));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-rule-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rule-compare:write");
      if (denied) return denied;
      const body = await c.req.json();
      const setA: RuleSetV14 = {
        dept: String(body?.setA?.dept ?? "心内科"),
        passRate: Number(body?.setA?.passRate ?? 0),
        ruleCount: Number(body?.setA?.ruleCount ?? 0),
      };
      const setB: RuleSetV14 = {
        dept: String(body?.setB?.dept ?? "普外科"),
        passRate: Number(body?.setB?.passRate ?? 0),
        ruleCount: Number(body?.setB?.ruleCount ?? 0),
      };
      const result = compareRuleSets(setA, setB);
      const report = buildRuleCompareReport(result);
      return json(ok({ setA, setB, result, report }));
    },
  },
];
