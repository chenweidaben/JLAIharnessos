/**
 * 健澜科技 jlmedaios - 病历质控专家库管理 V14 路由（M474-C）
 *
 * GET  /api/v1/emr-qc-expert-pool  （read，auth:true，query 用 new URL 取 dept）返回专家列表
 * POST /api/v1/emr-qc-expert-pool  （auth:true，body 用 await c.req.json()）新增专家
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildExpertPool,
  searchExpertsByDept,
  type ExpertV14,
} from "../aggregators/emrQcExpertPoolV14Aggregator.js";

const demoExperts: ExpertV14[] = [
  { id: "EXP-001", name: "王医生", dept: "内科", title: "主任医师" },
  { id: "EXP-002", name: "李医生", dept: "外科", title: "副主任医师" },
  { id: "EXP-003", name: "张医生", dept: "内科", title: "主治医师" },
];

export const emrQcExpertPoolV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-expert-pool",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-expert-pool:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "";
      const experts = searchExpertsByDept(demoExperts, dept);
      return json(ok({ experts, total: experts.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-expert-pool",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-expert-pool:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { name?: string; dept?: string; title?: string };
      const expert = buildExpertPool(body.name ?? "", body.dept ?? "", body.title ?? "");
      return json(ok({ expert }));
    },
  },
];
