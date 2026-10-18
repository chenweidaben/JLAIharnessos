/**
 * 健澜科技 jlmedaios - 规则质控可视化配置 V14 路由（M461-B）
 *
 * GET /api/v1/qc-rule-config          （read，auth:true）返回规则列表
 * PUT /api/v1/qc-rule-config/:id      （auth:true，body { enabled?: boolean; weight?: number }）切换启停/调权重
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeQcRuleConfigListV14,
  computeQcRuleConfigToggleV14,
  computeQcRuleConfigWeightV14,
  DEFAULT_QC_RULE_CONFIG_V14,
  type QcRuleConfigV14,
} from "../aggregators/qcRuleConfigV14Aggregator.js";

/** 内存态规则集（演示用，生产环境应持久化） */
let rulesState: QcRuleConfigV14[] = DEFAULT_QC_RULE_CONFIG_V14.map((r) => ({ ...r }));

export const qcRuleConfigV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/qc-rule-config",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "qc-rule-config:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({ rules: computeQcRuleConfigListV14(rulesState) }));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/qc-rule-config/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "qc-rule-config:write");
      if (denied) return denied;
      const ruleId = (c.params.id ?? '').trim();
      const body = await c.req.json().catch(() => ({})) as { enabled?: boolean; weight?: number };
      if (typeof body.enabled === "boolean") {
        const result = computeQcRuleConfigToggleV14(rulesState, ruleId, body.enabled);
        rulesState = result.list;
        return json(ok({ rules: result.list, changedCount: result.changedCount }));
      }
      if (typeof body.weight === "number") {
        const result = computeQcRuleConfigWeightV14(rulesState, ruleId, body.weight);
        rulesState = result.list;
        return json(ok({ rules: result.list, weight: result.weight }));
      }
      return json(ok({ rules: rulesState }));
    },
  },
];
