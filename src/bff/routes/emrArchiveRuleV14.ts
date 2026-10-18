/**
 * 健澜科技 jlmedaios - 病历归档规则 V14 路由（M478-B）
 *
 * GET /api/v1/emr-archive-rule  （read，auth:true）返回归档规则列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildArchiveRule,
  type ArchiveRuleV14,
} from "../aggregators/emrArchiveRuleV14Aggregator.js";

const demoRules: ArchiveRuleV14[] = [
  buildArchiveRule("出院后30天归档", "daysSinceDischarge>=30", 30),
  buildArchiveRule("死亡病历永久保存", "deceased=true", 99),
];

export const emrArchiveRuleV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-archive-rule",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-rule:read");
      if (denied) return denied;
      return json(ok({ rules: demoRules }));
    },
  },
];
