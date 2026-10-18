/**
 * 健澜科技 jlmedaios - 病历质控操作日志 V14 路由（M473-C）
 *
 * GET /api/v1/emr-qc-op-log  （read，auth:true，query 用 new URL 取 operator/action）返回日志列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { filterOpLogs, type OpLogV14 } from "../aggregators/emrQcOpLogV14Aggregator.js";

const demoLogs: OpLogV14[] = [
  { id: "LOG-001", operator: "张三", action: "审核", target: "病历001", timestamp: "2026-10-01T08:00:00Z" },
  { id: "LOG-002", operator: "张三", action: "驳回", target: "病历002", timestamp: "2026-10-02T09:00:00Z" },
  { id: "LOG-003", operator: "李四", action: "审核", target: "病历003", timestamp: "2026-10-03T10:00:00Z" },
];

export const emrQcOpLogV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-op-log",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-op-log:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const operator = url.searchParams.get("operator") ?? "";
      const action = url.searchParams.get("action") ?? "";
      const logs = filterOpLogs(demoLogs, { operator, action });
      return json(ok({ logs, total: logs.length }));
    },
  },
];
