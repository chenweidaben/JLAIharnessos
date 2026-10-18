/**
 * 健澜科技 jlmedaios - 病程关键节点标记 V14 路由（M538-B）
 *
 * GET  /api/v1/emr-course-node  （read，auth:true）返回关键节点基础数据
 * POST /api/v1/emr-course-node  （auth:true）节点标记 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildCourseNode,
  buildCourseNodeReport,
  markCourseNode,
  type CourseNodeInputV14,
} from "../aggregators/emrCourseNodeV14Aggregator.js";

export const emrCourseNodeV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-course-node",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-course-node:read");
      if (denied) return denied;
      const node = buildCourseNode("REC501", "普外科");
      return json(ok(node));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-course-node",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-course-node:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: CourseNodeInputV14 = {
        nodeType: String(obj?.nodeType ?? "入院") as CourseNodeInputV14["nodeType"],
        day: Number(obj?.day ?? 0),
      };
      const result = markCourseNode(input);
      const report = buildCourseNodeReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
