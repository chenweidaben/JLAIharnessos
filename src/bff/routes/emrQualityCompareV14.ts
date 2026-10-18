/**
 * 健澜科技 jlmedaios - 病历质量科室对比 V14 路由（M536-C）
 *
 * GET  /api/v1/emr-quality-compare  （read，auth:true）返回科室对比基础数据
 * POST /api/v1/emr-quality-compare  （auth:true）科室对比 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQualityCompare,
  buildQualityCompareReport,
  compareDeptQuality,
  type QualityCompareInputV14,
} from "../aggregators/emrQualityCompareV14Aggregator.js";

export const emrQualityCompareV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-quality-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quality-compare:read");
      if (denied) return denied;
      const compare = buildQualityCompare("心内科", "呼吸科");
      return json(ok(compare));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-quality-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quality-compare:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: QualityCompareInputV14 = {
        scoreA: Number(obj?.scoreA ?? 0),
        scoreB: Number(obj?.scoreB ?? 0),
      };
      const result = compareDeptQuality(input);
      const report = buildQualityCompareReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
