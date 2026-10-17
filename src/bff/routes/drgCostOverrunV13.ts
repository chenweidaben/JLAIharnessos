/**
 * 健澜科技 jlmedaios - DRG 费用超支预警 V13 路由（M313-A）
 *
 * GET /api/v1/drg-cost-overrun?dept=
 *
 * 权限：drg-cost-overrun:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateDrgByDeptV13,
  classifyDrgCaseV13,
  computeDrgVarianceV13,
  type DrgCaseV13,
} from "../aggregators/drgCostOverrunV13Aggregator.js";

const cases: DrgCaseV13[] = [
  { caseId: "p1", dept: "cardio", actualCost: 12000, drgStandard: 10000 },
  { caseId: "p2", dept: "cardio", actualCost: 9000, drgStandard: 10000 },
  { caseId: "p3", dept: "surgery", actualCost: 15000, drgStandard: 12000 },
  { caseId: "p4", dept: "surgery", actualCost: 11000, drgStandard: 12000 },
];

export const drgCostOverrunV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drg-cost-overrun",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drg-cost-overrun:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept");
      const scoped = dept ? cases.filter((x) => x.dept === dept) : cases;
      return json(ok({
        summaries: aggregateDrgByDeptV13(scoped),
        cases: scoped.map((x) => ({
          ...x,
          variance: computeDrgVarianceV13(x),
          classification: classifyDrgCaseV13(computeDrgVarianceV13(x)),
        })),
      }));
    },
  },
];
