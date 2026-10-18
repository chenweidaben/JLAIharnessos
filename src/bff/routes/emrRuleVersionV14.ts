/**
 * 健澜科技 jlmedaios - 病历质控规则版本管理 V14 路由（M472-B）
 *
 * GET  /api/v1/emr-rule-version/:ruleId  （read，auth:true，path 参数 c.params.ruleId）返回版本历史
 * POST /api/v1/emr-rule-version/:ruleId  （auth:true，path 参数 c.params.ruleId，body 用 await c.req.json()）发布新版本
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildVersionHistory,
  type VersionEntryV14,
} from "../aggregators/emrRuleVersionV14Aggregator.js";

const demoVersions: VersionEntryV14[] = [
  { version: "v1.0", changes: "关键词A,关键词B", date: "2026-01-01" },
  { version: "v1.1", changes: "关键词B,关键词C", date: "2026-06-01" },
];

export const emrRuleVersionV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-rule-version/:ruleId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-rule-version:read");
      if (denied) return denied;
      const ruleId = (c.params.ruleId ?? "").trim();
      const history = buildVersionHistory(ruleId, demoVersions);
      return json(ok({ history }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-rule-version/:ruleId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-rule-version:write");
      if (denied) return denied;
      const ruleId = (c.params.ruleId ?? "").trim();
      const body = await c.req.json().catch(() => ({})) as { version?: string; changes?: string };
      const newVersion: VersionEntryV14 = {
        version: body.version ?? "v2.0",
        changes: body.changes ?? "",
        date: new Date().toISOString().slice(0, 10),
      };
      return json(ok({ ruleId, newVersion }));
    },
  },
];
