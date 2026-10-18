/**
 * 健澜科技 jlmedaios - 质控法律法规 V14 路由（M505-D，M505 收官）
 *
 * GET /api/v1/emr-qc-regulation?keyword=xxx  （read，auth:true）返回法律法规
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRegulation,
  buildRegulationReport,
  searchRegulation,
  type RegulationV14,
} from "../aggregators/emrQcRegulationV14Aggregator.js";

const allRegulations: RegulationV14[] = [
  buildRegulation("医疗质量管理办法", "部门规章", "2023-08-01"),
  buildRegulation("中华人民共和国执业医师法", "法律", "2022-03-01"),
  buildRegulation("医疗机构管理条例", "行政法规", "2022-05-01"),
];

export const emrQcRegulationV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-regulation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-regulation:read");
      if (denied) return denied;
      const keyword = new URL(c.req.url).searchParams.get("keyword") ?? "";
      const results = keyword ? searchRegulation(allRegulations, keyword) : allRegulations;
      const report = buildRegulationReport(results);
      return json(ok({ report }));
    },
  },
];
