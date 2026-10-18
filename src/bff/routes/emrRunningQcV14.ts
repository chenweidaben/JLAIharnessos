/**
 * 健澜科技 jlmedaios - 运行病历质控 V14 路由（M481-A）
 *
 * GET /api/v1/emr-running-qc  （read，auth:true）返回运行病历质控列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildRunningQc, type RunningQcV14 } from "../aggregators/emrRunningQcV14Aggregator.js";

const demoRecords: RunningQcV14[] = [
  buildRunningQc("MR001", "张三", "内科"),
  buildRunningQc("MR002", "李四", "外科"),
  buildRunningQc("MR003", "王五", "妇产科"),
];

export const emrRunningQcV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-running-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-running-qc:read");
      if (denied) return denied;
      return json(ok({ records: demoRecords }));
    },
  },
];
