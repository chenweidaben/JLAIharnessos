/**
 * 健澜科技 jlmedaios - 病历检验异常值提醒 V14 路由（M537-C）
 *
 * GET  /api/v1/emr-lab-alert  （read，auth:true）返回检验提醒基础数据
 * POST /api/v1/emr-lab-alert  （auth:true）异常值检测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildLabAlert,
  buildLabAlertReport,
  detectAbnormalLab,
  type LabAlertInputV14,
} from "../aggregators/emrLabAlertV14Aggregator.js";

export const emrLabAlertV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-lab-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-lab-alert:read");
      if (denied) return denied;
      const alert = buildLabAlert("REC402", "检验科");
      return json(ok(alert));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-lab-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-lab-alert:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: LabAlertInputV14 = {
        testName: String(obj?.testName ?? ""),
        value: Number(obj?.value ?? 0),
        normalMin: Number(obj?.normalMin ?? 0),
        normalMax: Number(obj?.normalMax ?? 0),
      };
      const result = detectAbnormalLab(input);
      const report = buildLabAlertReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
