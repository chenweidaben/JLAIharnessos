/**
 * 健澜科技 jlmedaios - 病历质控自动派单 V14 路由（M521-B）
 *
 * GET  /api/v1/emr-qc-auto-dispatch  （read，auth:true）返回派单基础数据
 * POST /api/v1/emr-qc-auto-dispatch  （auth:true）自动派单 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAutoDispatch,
  buildAutoDispatchReport,
  dispatchQcTask,
  type AssigneeV14,
} from "../aggregators/emrQcAutoDispatchV14Aggregator.js";

export const emrQcAutoDispatchV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-auto-dispatch",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-auto-dispatch:read");
      if (denied) return denied;
      const dispatch = buildAutoDispatch("REC022", "普外科", "major");
      return json(ok(dispatch));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-auto-dispatch",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-auto-dispatch:write");
      if (denied) return denied;
      const body = await c.req.json();
      const task = buildAutoDispatch(
        String(body?.recordId ?? "REC022"),
        String(body?.dept ?? "普外科"),
        String(body?.defectLevel ?? "major"),
      );
      const assignees: AssigneeV14[] = Array.isArray(body?.assignees)
        ? body.assignees.map((a: unknown) => ({
            name: String((a as AssigneeV14)?.name ?? ""),
            workload: Number((a as AssigneeV14)?.workload ?? 0),
          }))
        : [];
      const result = dispatchQcTask(task, assignees);
      const report = buildAutoDispatchReport(result);
      return json(ok({ task, assignees, result, report }));
    },
  },
];
