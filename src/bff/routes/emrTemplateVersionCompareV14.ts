/**
 * 健澜科技 jlmedaios - 模板版本对比 V14 路由（M524-A）
 *
 * GET  /api/v1/emr-template-version-compare  （read，auth:true）返回版本对比基础数据
 * POST /api/v1/emr-template-version-compare  （auth:true）版本对比 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildVersionCompare,
  buildVersionCompareReport,
  compareTemplateVersions,
  type VersionCompareInputV14,
} from "../aggregators/emrTemplateVersionCompareV14Aggregator.js";

export const emrTemplateVersionCompareV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-version-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-version-compare:read");
      if (denied) return denied;
      const compare = buildVersionCompare("入院记录模板", "v2.0", "v3.0");
      return json(ok(compare));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-version-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-version-compare:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: VersionCompareInputV14 = {
        oldFields: Array.isArray(body?.oldFields) ? body.oldFields.map((f: unknown) => String(f)) : [],
        newFields: Array.isArray(body?.newFields) ? body.newFields.map((f: unknown) => String(f)) : [],
      };
      const result = compareTemplateVersions(input);
      const report = buildVersionCompareReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
