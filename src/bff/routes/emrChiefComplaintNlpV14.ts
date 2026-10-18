/**
 * 健澜科技 jlmedaios - 病历主诉结构化提取 V14 路由（M529-A）
 *
 * GET  /api/v1/emr-chief-complaint-nlp  （read，auth:true）返回主诉提取基础数据
 * POST /api/v1/emr-chief-complaint-nlp  （auth:true）主诉结构化提取 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildChiefComplaintNlp,
  buildChiefComplaintNlpReport,
  extractChiefComplaintStruct,
  type ChiefComplaintNlpInputV14,
} from "../aggregators/emrChiefComplaintNlpV14Aggregator.js";

export const emrChiefComplaintNlpV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-chief-complaint-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-chief-complaint-nlp:read");
      if (denied) return denied;
      const nlp = buildChiefComplaintNlp("REC060", "心内科");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-chief-complaint-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-chief-complaint-nlp:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: ChiefComplaintNlpInputV14 = {
        rawText: String(body?.rawText ?? ""),
      };
      const result = extractChiefComplaintStruct(input);
      const report = buildChiefComplaintNlpReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
