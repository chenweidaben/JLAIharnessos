/**
 * 健澜科技 jlmedaios - 模板科室个性化 V14 路由（M524-B）
 *
 * GET  /api/v1/emr-template-dept-personal  （read，auth:true）返回科室个性化基础数据
 * POST /api/v1/emr-template-dept-personal  （auth:true）科室个性化定制 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDeptPersonal,
  buildDeptPersonalReport,
  customizeDeptTemplate,
  type DeptCustomizeInputV14,
} from "../aggregators/emrTemplateDeptPersonalV14Aggregator.js";

export const emrTemplateDeptPersonalV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-dept-personal",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-dept-personal:read");
      if (denied) return denied;
      const personal = buildDeptPersonal("心内科", "入院记录模板");
      return json(ok(personal));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-dept-personal",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-dept-personal:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: DeptCustomizeInputV14 = {
        baseFields: Array.isArray(body?.baseFields) ? body.baseFields.map((f: unknown) => String(f)) : [],
        deptSpecificFields: Array.isArray(body?.deptSpecificFields) ? body.deptSpecificFields.map((f: unknown) => String(f)) : [],
      };
      const result = customizeDeptTemplate(input);
      const report = buildDeptPersonalReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
