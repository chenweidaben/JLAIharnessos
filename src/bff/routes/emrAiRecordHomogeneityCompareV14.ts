/**
 * 健澜科技 jlmedaios - 病历AI病历同质化对比 V14 路由（M553-D，M553 收官）
 *
 * GET  /api/v1/emr-ai-record-homogeneity-compare  （read，auth:true）返回 AI 病历同质化对比基础数据
 * POST /api/v1/emr-ai-record-homogeneity-compare  （auth:true）AI 病历同质化对比 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiRecordHomogeneityCompare,
  buildAiRecordHomogeneityCompareReport,
  compareRecordHomogeneityByAi,
  type AiRecordHomogeneityCompareInputV14,
} from "../aggregators/emrAiRecordHomogeneityCompareV14Aggregator.js";

export const emrAiRecordHomogeneityCompareV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-record-homogeneity-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-homogeneity-compare:read");
      if (denied) return denied;
      const base = buildAiRecordHomogeneityCompare("RECB036", "医务处");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-record-homogeneity-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-homogeneity-compare:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiRecordHomogeneityCompareInputV14 = {
        deptARecords: Number(obj?.deptARecords ?? 0),
        deptBRecords: Number(obj?.deptBRecords ?? 0),
        avgLengthA: Number(obj?.avgLengthA ?? 0),
        avgLengthB: Number(obj?.avgLengthB ?? 0),
      };
      const result = compareRecordHomogeneityByAi(input);
      const report = buildAiRecordHomogeneityCompareReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
