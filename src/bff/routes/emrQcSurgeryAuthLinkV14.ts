/**
 * 健澜科技 jlmedaios - 质控-手术分级授权联动 V14 路由（M515-D，M515 收官）
 *
 * GET  /api/v1/emr-qc-surgery-auth-link  （read，auth:true）返回手术授权联动数据
 * POST /api/v1/emr-qc-surgery-auth-link  （auth:true）检查手术授权一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSurgeryAuthLink,
  buildSurgeryAuthLinkReport,
  checkSurgeryAuthConsistency,
  type SurgeryAuthConsistencyRecordV14,
} from "../aggregators/emrQcSurgeryAuthLinkV14Aggregator.js";

export const emrQcSurgeryAuthLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-surgery-auth-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-surgery-auth-link:read");
      if (denied) return denied;
      const link = buildSurgeryAuthLink("REC012", "主任医师", "三级手术");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-surgery-auth-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-surgery-auth-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: SurgeryAuthConsistencyRecordV14 = {
        hasAuth: Boolean(body?.hasAuth),
        hasLevelMatch: Boolean(body?.hasLevelMatch),
        hasRecord: Boolean(body?.hasRecord),
      };
      const result = checkSurgeryAuthConsistency(record);
      const report = buildSurgeryAuthLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
