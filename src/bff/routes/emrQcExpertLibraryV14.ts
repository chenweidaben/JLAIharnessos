/**
 * 健澜科技 jlmedaios - 质控专家库管理 V14 路由（M502-A）
 *
 * GET  /api/v1/emr-qc-expert-library  （read，auth:true）返回专家库列表
 * POST /api/v1/emr-qc-expert-library  （auth:true）添加专家
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { addExpert, buildExpertLibrary, type ExpertLibraryV14 } from "../aggregators/emrQcExpertLibraryV14Aggregator.js";

let sampleLibrary: ExpertLibraryV14[] = [
  buildExpertLibrary("张教授", "内科", "心血管"),
  buildExpertLibrary("李教授", "外科", "骨科"),
];

export const emrQcExpertLibraryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-expert-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-expert-library:read");
      if (denied) return denied;
      return json(ok({ library: sampleLibrary, total: sampleLibrary.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-expert-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-expert-library:write");
      if (denied) return denied;
      const body = await c.req.json();
      const name = typeof body?.name === "string" ? body.name : "";
      const dept = typeof body?.dept === "string" ? body.dept : "";
      const specialty = typeof body?.specialty === "string" ? body.specialty : "";
      const expert = buildExpertLibrary(name, dept, specialty);
      sampleLibrary = addExpert(sampleLibrary, expert);
      return json(ok({ library: sampleLibrary, total: sampleLibrary.length }));
    },
  },
];
