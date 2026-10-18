/**
 * 健澜科技 jlmedaios - 质控规则可视化编辑器 V14 路由（M519-A）
 *
 * GET  /api/v1/emr-qc-rule-editor  （read，auth:true）返回规则编辑器基础数据
 * POST /api/v1/emr-qc-rule-editor  （auth:true）校验规则配置 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRuleEditor,
  buildRuleEditorReport,
  validateRuleConfig,
  type RuleConfigV14,
} from "../aggregators/emrQcRuleEditorV14Aggregator.js";

export const emrQcRuleEditorV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-rule-editor",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rule-editor:read");
      if (denied) return denied;
      const editor = buildRuleEditor("病程记录及时性", "时限类", "major");
      return json(ok(editor));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-rule-editor",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rule-editor:write");
      if (denied) return denied;
      const body = await c.req.json();
      const config: RuleConfigV14 = {
        name: String(body?.name ?? ""),
        threshold: Number(body?.threshold ?? 0),
        enabled: Boolean(body?.enabled),
      };
      const result = validateRuleConfig(config);
      const report = buildRuleEditorReport(result);
      return json(ok({ config, result, report }));
    },
  },
];
