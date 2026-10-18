/**
 * 健澜科技 jlmedaios - 质控-手术麻醉联动 V14 路由（M513-D，M513 收官）
 *
 * GET  /api/v1/emr-qc-surgery-link  （read，auth:true）返回手术麻醉联动数据
 * POST /api/v1/emr-qc-surgery-link  （auth:true）检查手术麻醉一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSurgeryLink,
  buildSurgeryLinkReport,
  checkSurgeryConsistency,
  type SurgeryConsistencyRecordV14,
} from "../aggregators/emrQcSurgeryLinkV14Aggregator.js";

export const emrQcSurgeryLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-surgery-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-surgery-link:read");
      if (denied) return denied;
      const link = buildSurgeryLink("REC004", "李主任", "全麻");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-surgery-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-surgery-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: SurgeryConsistencyRecordV14 = {
        hasOperativeNote: Boolean(body?.hasOperativeNote),
        hasAnesthesiaRecord: Boolean(body?.hasAnesthesiaRecord),
        hasPostOpNote: Boolean(body?.hasPostOpNote),
      };
      const result = checkSurgeryConsistency(record);
      const report = buildSurgeryLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
