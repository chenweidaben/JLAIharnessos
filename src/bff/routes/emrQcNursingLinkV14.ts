/**
 * 健澜科技 jlmedaios - 质控-护理记录联动 V14 路由（M513-C）
 *
 * GET  /api/v1/emr-qc-nursing-link  （read，auth:true）返回护理联动数据
 * POST /api/v1/emr-qc-nursing-link  （auth:true）检查护理一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNursingLink,
  buildNursingLinkReport,
  checkNursingConsistency,
  type NursingConsistencyRecordV14,
} from "../aggregators/emrQcNursingLinkV14Aggregator.js";

export const emrQcNursingLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-nursing-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-nursing-link:read");
      if (denied) return denied;
      const link = buildNursingLink("REC003", "王护士", 10);
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-nursing-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-nursing-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: NursingConsistencyRecordV14 = {
        hasCareRecord: Boolean(body?.hasCareRecord),
        hasVitalSigns: Boolean(body?.hasVitalSigns),
        hasSignature: Boolean(body?.hasSignature),
      };
      const result = checkNursingConsistency(record);
      const report = buildNursingLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
