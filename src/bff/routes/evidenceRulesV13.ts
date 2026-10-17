/**
 * 健澜科技 jlmedaios - 疗效证据反哺规则权重 V13 路由（M300-B）
 *
 * GET /api/v1/evidence-rules
 *
 * 权限：evidence-rules:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildEvidenceDrivenRuleV13,
  filterEvidenceBasedRulesV13,
  type EvidenceRuleV13,
} from "../aggregators/evidenceRulesV13Aggregator.js";

const allRules: EvidenceRuleV13[] = [
  buildEvidenceDrivenRuleV13("e-1", 0.5, "strong"),
  buildEvidenceDrivenRuleV13("e-2", 0.4, "moderate"),
  buildEvidenceDrivenRuleV13("e-3", 0.3, "inconclusive"),
  buildEvidenceDrivenRuleV13("e-4", 0.4, "reverse"),
];

export const evidenceRulesV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/evidence-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "evidence-rules:read");
      if (denied) return denied;
      return json(ok(filterEvidenceBasedRulesV13(allRules)));
    },
  },
];
