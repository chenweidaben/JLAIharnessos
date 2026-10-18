/**
 * 健澜科技 jlmedaios - 病历调阅申请审批 V14 路由（M534-A）
 *
 * GET  /api/v1/emr-access-request  （read，auth:true）返回调阅申请基础数据
 * POST /api/v1/emr-access-request  （auth:true）调阅审批 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAccessRequest,
  buildAccessRequestReport,
  approveAccessRequest,
  type AccessRequestInputV14,
} from "../aggregators/emrAccessRequestV14Aggregator.js";

export const emrAccessRequestV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-access-request",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-access-request:read");
      if (denied) return denied;
      const req = buildAccessRequest("REC100", "张医生");
      return json(ok(req));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-access-request",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-access-request:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AccessRequestInputV14 = {
        requestId: String(obj?.requestId ?? ""),
        decision: (obj?.decision ?? "批准") as AccessRequestInputV14["decision"],
        reason: String(obj?.reason ?? ""),
      };
      const result = approveAccessRequest(input);
      const report = buildAccessRequestReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
