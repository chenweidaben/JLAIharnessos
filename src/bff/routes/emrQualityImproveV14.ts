/**
 * 健澜科技 jlmedaios - 病历质量改进建议 V14 路由（M536-D）
 *
 * GET  /api/v1/emr-quality-improve  （read，auth:true）返回改进建议基础数据
 * POST /api/v1/emr-quality-improve  （auth:true）改进建议生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQualityImprove,
  buildQualityImproveReport,
  suggestQualityImprovement,
  type QualityImproveInputV14,
} from "../aggregators/emrQualityImproveV14Aggregator.js";

export const emrQualityImproveV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-quality-improve",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quality-improve:read");
      if (denied) return denied;
      const improve = buildQualityImprove("心内科", "REC303");
      return json(ok(improve));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-quality-improve",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quality-improve:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: QualityImproveInputV14 = {
        score: Number(obj?.score ?? 0),
        block: Number(obj?.block ?? 0),
        major: Number(obj?.major ?? 0),
        minor: Number(obj?.minor ?? 0),
      };
      const result = suggestQualityImprovement(input);
      const report = buildQualityImproveReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
