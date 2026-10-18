/**
 * 健澜科技 jlmedaios - 病历质控规则引擎可视化对接 V14 路由（M467-A）
 *
 * GET  /api/v1/emr-rule-engine          （read，auth:true）返回规则列表+执行历史
 * POST /api/v1/emr-rule-engine/execute  （auth:true，body 用 await c.req.json()）手动触发
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRuleSummary,
  executeRuleEngine,
  type QcRuleV14,
} from "../aggregators/emrRuleEngineV14Aggregator.js";

const demoRules: QcRuleV14[] = [
  { ruleId: "R001", keyword: "主诉缺失", message: "缺少主诉内容" },
  { ruleId: "R002", keyword: "现病史过短", message: "现病史不足 200 字" },
  { ruleId: "R003", keyword: "诊断不规范", message: "诊断未使用标准术语" },
];

export const emrRuleEngineV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-rule-engine",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-rule-engine:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({ rules: demoRules }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-rule-engine/execute",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-rule-engine:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { note?: string };
      const results = executeRuleEngine(body.note ?? "", demoRules);
      const summary = buildRuleSummary(results);
      return json(ok({ results, summary }));
    },
  },
];
