/**
 * 健澜科技 jlmedaios - 质控质量改进项目 V14 路由（M504-B）
 *
 * GET  /api/v1/emr-qc-quality-project  （read，auth:true）返回项目列表
 * POST /api/v1/emr-qc-quality-project  （auth:true）添加项目
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { addProject, buildProject, type QualityProjectV14 } from "../aggregators/emrQcQualityProjectV14Aggregator.js";

let sampleProjects: QualityProjectV14[] = [
  buildProject("降低缺陷率", "张主任", "进行中"),
  buildProject("提升合格率", "李主任", "已完成"),
];

export const emrQcQualityProjectV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-quality-project",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-quality-project:read");
      if (denied) return denied;
      return json(ok({ projects: sampleProjects, total: sampleProjects.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-quality-project",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-quality-project:write");
      if (denied) return denied;
      const body = await c.req.json();
      const name = typeof body?.name === "string" ? body.name : "";
      const owner = typeof body?.owner === "string" ? body.owner : "";
      const status = typeof body?.status === "string" ? body.status : "进行中";
      const project = buildProject(name, owner, status);
      sampleProjects = addProject(sampleProjects, project);
      return json(ok({ projects: sampleProjects, total: sampleProjects.length }));
    },
  },
];
