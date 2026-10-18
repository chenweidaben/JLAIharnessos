/**
 * 健澜科技 jlmedaios - 病历缺陷闭环跟踪 V14 路由（M527-D，M527 收官）
 *
 * GET  /api/v1/emr-defect-closed-loop  （read，auth:true）返回闭环跟踪基础数据
 * POST /api/v1/emr-defect-closed-loop  （auth:true）闭环跟踪 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDefectClosedLoop,
  buildDefectClosedLoopReport,
  trackDefectResolution,
  type DefectClosedLoopInputV14,
} from "../aggregators/emrDefectClosedLoopV14Aggregator.js";

export const emrDefectClosedLoopV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-defect-closed-loop",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-defect-closed-loop:read");
      if (denied) return denied;
      const track = buildDefectClosedLoop("D030", "心内科");
      return json(ok(track));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-defect-closed-loop",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-defect-closed-loop:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: DefectClosedLoopInputV14 = {
        defectId: String(body?.defectId ?? ""),
        raisedDate: String(body?.raisedDate ?? ""),
        resolvedDate: body?.resolvedDate != null ? String(body.resolvedDate) : null,
        status: (body?.status as "待整改" | "整改中" | "已闭环") ?? "待整改",
      };
      const result = trackDefectResolution(input);
      const report = buildDefectClosedLoopReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
