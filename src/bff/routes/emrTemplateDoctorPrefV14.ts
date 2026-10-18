/**
 * 健澜科技 jlmedaios - 模板医生个人偏好 V14 路由（M524-C）
 *
 * GET  /api/v1/emr-template-doctor-pref  （read，auth:true）返回医生偏好基础数据
 * POST /api/v1/emr-template-doctor-pref  （auth:true）获取医生偏好 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDoctorPref,
  buildDoctorPrefReport,
  getDoctorPreference,
  type DoctorPrefInputV14,
} from "../aggregators/emrTemplateDoctorPrefV14Aggregator.js";

export const emrTemplateDoctorPrefV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-doctor-pref",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-doctor-pref:read");
      if (denied) return denied;
      const pref = buildDoctorPref("张医生", "心内科");
      return json(ok(pref));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-doctor-pref",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-doctor-pref:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: DoctorPrefInputV14 = {
        doctorName: String(body?.doctorName ?? ""),
        frequentTemplates: Array.isArray(body?.frequentTemplates) ? body.frequentTemplates.map((t: unknown) => String(t)) : [],
        defaultTemplate: String(body?.defaultTemplate ?? ""),
      };
      const result = getDoctorPreference(input);
      const report = buildDoctorPrefReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
