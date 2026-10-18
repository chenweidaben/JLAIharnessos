/**
 * 健澜科技 jlmedaios - 质控-抗菌药物管理联动 V14 路由（M514-D，M514 收官）
 *
 * GET  /api/v1/emr-qc-antibiotic-link  （read，auth:true）返回抗菌药物联动数据
 * POST /api/v1/emr-qc-antibiotic-link  （auth:true）检查抗菌药物一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAntibioticLink,
  buildAntibioticLinkReport,
  checkAntibioticConsistency,
  type AntibioticConsistencyRecordV14,
} from "../aggregators/emrQcAntibioticLinkV14Aggregator.js";

export const emrQcAntibioticLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-antibiotic-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-antibiotic-link:read");
      if (denied) return denied;
      const link = buildAntibioticLink("REC008", "头孢呋辛", 7);
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-antibiotic-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-antibiotic-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: AntibioticConsistencyRecordV14 = {
        hasIndication: Boolean(body?.hasIndication),
        hasCulture: Boolean(body?.hasCulture),
        hasDeEscalation: Boolean(body?.hasDeEscalation),
      };
      const result = checkAntibioticConsistency(record);
      const report = buildAntibioticLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
