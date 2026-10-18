/**
 * 健澜科技 jlmedaios - 病历隐私脱敏展示 V14 路由（M466-B）
 *
 * GET /api/v1/emr-masking/:noteId （read，auth:true，path 参数 c.params.noteId，query 用 new URL 取 role）返回脱敏后病历文本
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  maskByRole,
  type MaskRoleV14,
} from "../aggregators/emrMaskingV14Aggregator.js";

const demoNote = "患者张三丰，手机号 13812345678，身份证 110101199001011234，因肺炎入院。";

export const emrMaskingV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-masking/:noteId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-masking:read");
      if (denied) return denied;
      const noteId = (c.params.noteId ?? "").trim();
      const url = new URL(c.req.url);
      const roleParam = url.searchParams.get("role") ?? "public";
      const role: MaskRoleV14 = roleParam === "doctor" || roleParam === "nurse" || roleParam === "admin" ? roleParam : "public";
      const masked = maskByRole(role, demoNote);
      return json(ok({ noteId, role, original: demoNote, masked }));
    },
  },
];
