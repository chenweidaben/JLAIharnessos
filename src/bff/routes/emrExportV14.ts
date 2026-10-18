/**
 * 健澜科技 jlmedaios - 病历数据导出与区域上报 V14 路由（M463-C）
 *
 * GET /api/v1/emr-export   （read，auth:true）导出任务列表
 * POST /api/v1/emr-export  （auth:true，body 用 await c.req.json()）创建上报任务
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildExportPayload,
  validateExportSchema,
  type ExportPayloadV14,
} from "../aggregators/emrExportV14Aggregator.js";

/** 内存态导出任务集（演示用，生产环境应持久化） */
const exportState: ExportPayloadV14[] = [];

export const emrExportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-export",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-export:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({ tasks: exportState }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-export",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-export:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        patientId?: string;
        patientName?: string;
        hospitalCode?: string;
        recordType?: string;
        diagnoses?: string[];
      };
      const payload = buildExportPayload({
        patientId: body.patientId ?? "",
        patientName: body.patientName ?? "",
        hospitalCode: body.hospitalCode ?? "",
        recordType: body.recordType ?? "",
        diagnoses: body.diagnoses ?? [],
      });
      const validation = validateExportSchema(payload);
      if (!validation.valid) {
        return json(ok({ error: "必填字段缺失", missing: validation.missing }));
      }
      exportState.push(payload);
      return json(ok({ task: payload }));
    },
  },
];
