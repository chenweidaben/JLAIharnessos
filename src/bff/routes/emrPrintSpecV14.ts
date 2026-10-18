/**
 * 健澜科技 jlmedaios - 病历打印规范 V14 路由（M478-C）
 *
 * GET /api/v1/emr-print-spec  （read，auth:true）返回打印规范列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPrintSpec,
  validatePrintLayout,
  type PrintSpecV14,
} from "../aggregators/emrPrintSpecV14Aggregator.js";

const demoSpecs: PrintSpecV14[] = [
  buildPrintSpec("A4打印", "A4", true),
  buildPrintSpec("B5草稿", "B5", false),
];

export const emrPrintSpecV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-print-spec",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-print-spec:read");
      if (denied) return denied;
      const validations = demoSpecs.map((s) => ({ spec: s, validation: validatePrintLayout(s) }));
      return json(ok({ specs: validations }));
    },
  },
];
