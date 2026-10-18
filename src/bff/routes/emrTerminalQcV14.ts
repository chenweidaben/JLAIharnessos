/**
 * 健澜科技 jlmedaios - 终末质控 V14 路由（M480-D，M480 收官）
 *
 * GET  /api/v1/emr-terminal-qc           （read，auth:true）返回终末质控列表
 * POST /api/v1/emr-terminal-qc/submit    （auth:true，body 用 await c.req.json()）提交终末质控结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildTerminalQc, submitTerminalQc, type TerminalQcV14 } from "../aggregators/emrTerminalQcV14Aggregator.js";

const demoRecords: TerminalQcV14[] = [
  buildTerminalQc("MR001", "内科"),
  buildTerminalQc("MR002", "外科"),
  buildTerminalQc("MR003", "妇产科"),
];

export const emrTerminalQcV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-terminal-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-terminal-qc:read");
      if (denied) return denied;
      return json(ok({ records: demoRecords }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-terminal-qc/submit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-terminal-qc:write");
      if (denied) return denied;
      const body = await c.req.json() as { medicalRecordId?: string; dept?: string; score?: number; passed?: boolean };
      const record = buildTerminalQc(body.medicalRecordId ?? "MR001", body.dept ?? "内科");
      const submission = submitTerminalQc(record, {
        score: body.score ?? 0,
        passed: body.passed ?? false,
      });
      return json(ok({ submission }));
    },
  },
];
