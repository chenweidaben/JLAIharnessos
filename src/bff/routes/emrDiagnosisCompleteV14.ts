/**
 * 健澜科技 jlmedaios - 病历诊断完整性检查 V14 路由（M537-D）
 *
 * GET  /api/v1/emr-diagnosis-complete  （read，auth:true）返回诊断检查基础数据
 * POST /api/v1/emr-diagnosis-complete  （auth:true）诊断完整性检查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDiagnosisComplete,
  buildDiagnosisCompleteReport,
  checkDiagnosisComplete,
  type DiagnosisCompleteInputV14,
} from "../aggregators/emrDiagnosisCompleteV14Aggregator.js";

export const emrDiagnosisCompleteV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-diagnosis-complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-diagnosis-complete:read");
      if (denied) return denied;
      const check = buildDiagnosisComplete("REC403", "神经内科");
      return json(ok(check));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-diagnosis-complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-diagnosis-complete:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: DiagnosisCompleteInputV14 = {
        hasMainDiagnosis: Boolean(obj?.hasMainDiagnosis ?? false),
        hasSecondaryDiagnosis: Boolean(obj?.hasSecondaryDiagnosis ?? false),
        hasDiagnosisCode: Boolean(obj?.hasDiagnosisCode ?? false),
      };
      const result = checkDiagnosisComplete(input);
      const report = buildDiagnosisCompleteReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
