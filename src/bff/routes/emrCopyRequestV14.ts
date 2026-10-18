/**
 * 健澜科技 jlmedaios - 病历复印申请 V14 路由（M482-A）
 *
 * GET  /api/v1/emr-copy-request  （read，auth:true）返回复印申请列表
 * POST /api/v1/emr-copy-request （auth:true，body 用 await c.req.json()）提交复印申请
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { approveCopyRequest, buildCopyRequest, type CopyRequestV14 } from "../aggregators/emrCopyRequestV14Aggregator.js";

const demoRequests: CopyRequestV14[] = [
  buildCopyRequest("张三", "保险理赔", 3),
  buildCopyRequest("李四", "工伤鉴定", 2),
];

const demoApproved = approveCopyRequest(demoRequests[0], true);

export const emrCopyRequestV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-copy-request",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-copy-request:read");
      if (denied) return denied;
      return json(ok({ requests: demoRequests, approved: demoApproved }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-copy-request",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-copy-request:write");
      if (denied) return denied;
      const body = await c.req.json() as { patientName?: string; purpose?: string; copies?: number };
      const request = buildCopyRequest(
        body.patientName ?? "张三",
        body.purpose ?? "保险理赔",
        body.copies ?? 1,
      );
      const status = approveCopyRequest(request, true);
      return json(ok({ request, status }));
    },
  },
];
