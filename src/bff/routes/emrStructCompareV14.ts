/**
 * 健澜科技 jlmedaios - 病历结构化数据对比 V14 路由（M532-D，M532 收官）
 *
 * GET  /api/v1/emr-struct-compare  （read，auth:true）返回对比基础数据
 * POST /api/v1/emr-struct-compare  （auth:true）结构化对比 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildStructCompare,
  buildStructCompareReport,
  compareStructRecords,
  type StructCompareInputV14,
} from "../aggregators/emrStructCompareV14Aggregator.js";

export const emrStructCompareV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-struct-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-struct-compare:read");
      if (denied) return denied;
      const compare = buildStructCompare("心内科", "呼吸科");
      return json(ok(compare));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-struct-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-struct-compare:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: StructCompareInputV14 = {
        deptARate: Number(obj?.deptARate ?? 0),
        deptBRate: Number(obj?.deptBRate ?? 0),
      };
      const result = compareStructRecords(input);
      const report = buildStructCompareReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
