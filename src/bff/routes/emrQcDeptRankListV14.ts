/**
 * 健澜科技 jlmedaios - 科室质控排名（避让版）V14 路由（M542-B）
 *
 * GET  /api/v1/emr-qc-dept-rank-list  （read，auth:true）返回科室排名基础数据
 * POST /api/v1/emr-qc-dept-rank-list  （auth:true）科室排名 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQcDeptRankList,
  buildQcDeptRankListReport,
  rankQcDeptList,
  type QcDeptRankListInputV14,
} from "../aggregators/emrQcDeptRankListV14Aggregator.js";

export const emrQcDeptRankListV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dept-rank-list",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-rank-list:read");
      if (denied) return denied;
      const base = buildQcDeptRankList("2026-10");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-dept-rank-list",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-rank-list:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const rawDepts = Array.isArray(obj?.depts) ? (obj.depts as unknown[]) : [];
      const depts: { name: string; score: number }[] = rawDepts.map((d) => {
        const item = d as Record<string, unknown>;
        return { name: String(item?.name ?? ""), score: Number(item?.score ?? 0) };
      });
      const input: QcDeptRankListInputV14 = { depts };
      const result = rankQcDeptList(input);
      const report = buildQcDeptRankListReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
