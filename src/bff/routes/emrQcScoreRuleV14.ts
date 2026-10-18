/**
 * 健澜科技 jlmedaios - 质控评分规则配置 V14 路由（M492-A）
 *
 * GET /api/v1/emr-qc-score-rule  （read，auth:true）返回评分规则数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateScoreRules, buildScoreRule } from "../aggregators/emrQcScoreRuleV14Aggregator.js";

const sampleRules = [
  { id: "R001", name: "完整性", weight: 30 },
  { id: "R002", name: "及时性", weight: 20 },
  { id: "R003", name: "准确性", weight: 30 },
  { id: "R004", name: "规范性", weight: 20 },
];

export const emrQcScoreRuleV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-score-rule",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-score-rule:read");
      if (denied) return denied;
      const rules = sampleRules.map((r) => buildScoreRule(r.id, r.name, r.weight));
      const aggregate = aggregateScoreRules(rules);
      return json(ok({ rules, aggregate }));
    },
  },
];
