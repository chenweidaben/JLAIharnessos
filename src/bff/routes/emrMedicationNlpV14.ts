/**
 * 健澜科技 jlmedaios - 病历用药自动提取 V14 路由（M529-D，M529 收官）
 *
 * GET  /api/v1/emr-medication-nlp  （read，auth:true）返回用药提取基础数据
 * POST /api/v1/emr-medication-nlp  （auth:true）用药自动提取 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMedicationNlp,
  buildMedicationNlpReport,
  extractMedicationStruct,
  type MedicationNlpInputV14,
} from "../aggregators/emrMedicationNlpV14Aggregator.js";

export const emrMedicationNlpV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-medication-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-medication-nlp:read");
      if (denied) return denied;
      const nlp = buildMedicationNlp("REC063", "心内科");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-medication-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-medication-nlp:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: MedicationNlpInputV14 = {
        rawText: String(body?.rawText ?? ""),
      };
      const result = extractMedicationStruct(input);
      const report = buildMedicationNlpReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
