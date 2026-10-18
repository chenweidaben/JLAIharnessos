/**
 * 健澜科技 jlmedaios - 手术记录模板规范 V14 路由（M523-C）
 *
 * GET  /api/v1/emr-template-surgery-spec  （read，auth:true）返回规范基础数据
 * POST /api/v1/emr-template-surgery-spec  （auth:true）校验手术模板 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSurgerySpec,
  buildSurgerySpecReport,
  validateSurgeryTemplate,
  type SurgeryValidateInputV14,
} from "../aggregators/emrTemplateSurgerySpecV14Aggregator.js";

export const emrTemplateSurgerySpecV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-surgery-spec",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-surgery-spec:read");
      if (denied) return denied;
      const spec = buildSurgerySpec("腹腔镜胆囊切除术", "v2.0");
      return json(ok(spec));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-surgery-spec",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-surgery-spec:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: SurgeryValidateInputV14 = {
        hasPreOp: Boolean(body?.hasPreOp),
        hasIncision: Boolean(body?.hasIncision),
        hasAnesthesia: Boolean(body?.hasAnesthesia),
        hasPostOp: Boolean(body?.hasPostOp),
      };
      const result = validateSurgeryTemplate(input);
      const report = buildSurgerySpecReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
