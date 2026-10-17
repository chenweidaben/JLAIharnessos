/**
 * 健澜科技 jlmedaios - 病种/DRG 经营分析 V5 路由（M287-C）
 *
 * GET  /api/v1/drg-analysis 列表
 * GET  /api/v1/drg-analysis/:id 详情
 * POST /api/v1/drg-analysis/snapshot 写快照
 *
 * 权限：drg-analysis:read / drg-analysis:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDrgProfitV5,
  detectLossDrgV5,
  rankDrgV5,
  type DrgCase,
} from "../aggregators/drgAnalysisV5Aggregator.js";

const drgStore: DrgCase[] = [
  { drgCode: "AH1", drgName: "冠脉支架植入", caseCnt: 200, avgCost: 3.2, avgReimburse: 3.8, cmi: 2.5, los: 6 },
  { drgCode: "BJ1", drgName: "髋关节置换", caseCnt: 150, avgCost: 5.0, avgReimburse: 4.8, cmi: 3.0, los: 10 },
  { drgCode: "BR1", drgName: "阑尾炎切除", caseCnt: 300, avgCost: 0.8, avgReimburse: 1.0, cmi: 0.9, los: 4 },
  { drgCode: "ES1", drgName: "肺炎内科治疗", caseCnt: 400, avgCost: 1.2, avgReimburse: 1.1, cmi: 1.1, los: 7 },
];

export const drgAnalysisV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drg-analysis",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drg-analysis:read");
      if (denied) return denied;

      return json(ok({
        list: drgStore.map((d) => ({
          ...d,
          profit: buildDrgProfitV5(d),
        })),
        ranking: rankDrgV5(drgStore),
        lossDrgs: detectLossDrgV5(drgStore),
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/drg-analysis/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drg-analysis:read");
      if (denied) return denied;

      const id = c.params.id;
      const idx = Number(id) - 1;
      if (idx < 0 || idx >= drgStore.length) {
        return json(ok({ found: false }));
      }
      const drg = drgStore[idx];
      return json(ok({
        drg,
        profit: buildDrgProfitV5(drg),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/drg-analysis/snapshot",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drg-analysis:write");
      if (denied) return denied;

      const losses = detectLossDrgV5(drgStore);
      return json(ok({
        snapshotAt: Date.now(),
        totalDrg: drgStore.length,
        lossCount: losses.length,
        totalLossProfit: losses.reduce((s, d) => s + buildDrgProfitV5(d).totalProfit, 0),
      }));
    },
  },
];
