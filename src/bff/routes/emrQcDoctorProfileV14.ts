/**
 * 健澜科技 jlmedaios - 医生质控个人档案 V14 路由（M542-C）
 *
 * GET  /api/v1/emr-qc-doctor-profile  （read，auth:true）返回医生档案基础数据
 * POST /api/v1/emr-qc-doctor-profile  （auth:true）医生档案加载 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQcDoctorProfile,
  buildQcDoctorProfileReport,
  loadQcDoctorProfile,
  type QcDoctorProfileInputV14,
} from "../aggregators/emrQcDoctorProfileV14Aggregator.js";

export const emrQcDoctorProfileV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-doctor-profile",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-doctor-profile:read");
      if (denied) return denied;
      const base = buildQcDoctorProfile("D001", "张医生");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-doctor-profile",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-doctor-profile:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: QcDoctorProfileInputV14 = {
        doctorId: String(obj?.doctorId ?? ""),
        totalRecords: Number(obj?.totalRecords ?? 0),
        defectCount: Number(obj?.defectCount ?? 0),
        avgScore: Number(obj?.avgScore ?? 0),
      };
      const result = loadQcDoctorProfile(input);
      const report = buildQcDoctorProfileReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
