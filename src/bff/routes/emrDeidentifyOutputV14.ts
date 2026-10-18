/**
 * 健澜科技 jlmedaios - 病历脱敏输出 V14 路由（M528-B）
 *
 * GET  /api/v1/emr-deidentify-output  （read，auth:true）返回脱敏输出基础数据
 * POST /api/v1/emr-deidentify-output  （auth:true）脱敏处理 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDeidentifyOutput,
  buildDeidentifyOutputReport,
  deidentifyPatientData,
  type DeidentifyInputV14,
} from "../aggregators/emrDeidentifyOutputV14Aggregator.js";

export const emrDeidentifyOutputV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-deidentify-output",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-deidentify-output:read");
      if (denied) return denied;
      const output = buildDeidentifyOutput("REC051", 5);
      return json(ok(output));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-deidentify-output",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-deidentify-output:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: DeidentifyInputV14 = {
        patientName: String(body?.patientName ?? ""),
        idCard: String(body?.idCard ?? ""),
        phone: String(body?.phone ?? ""),
      };
      const result = deidentifyPatientData(input);
      const report = buildDeidentifyOutputReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
