/**
 * 健澜科技 jlmedaios - 病历结构化字段查询 V14 路由（M532-A）
 *
 * GET  /api/v1/emr-struct-query  （read，auth:true）返回字段查询基础数据
 * POST /api/v1/emr-struct-query  （auth:true）字段查询 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildStructQuery,
  buildStructQueryReport,
  queryStructFields,
  type StructQueryInputV14,
} from "../aggregators/emrStructQueryV14Aggregator.js";

export const emrStructQueryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-struct-query",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-struct-query:read");
      if (denied) return denied;
      const query = buildStructQuery("入院记录", "心内科");
      return json(ok(query));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-struct-query",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-struct-query:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: StructQueryInputV14 = {
        recordType: String(obj?.recordType ?? ""),
        availableFields: (obj?.availableFields ?? []) as string[],
        requestedFields: (obj?.requestedFields ?? []) as string[],
      };
      const result = queryStructFields(input);
      const report = buildStructQueryReport({
        foundCount: result.foundFields.length,
        missingCount: result.missingFields.length,
      });
      return json(ok({ input, result, report }));
    },
  },
];
