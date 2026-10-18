/**
 * 健澜科技 jlmedaios - 质控指标采集 V14 路由（M483-A）
 *
 * GET /api/v1/emr-qc-metric-collect  （read，auth:true）返回采集任务列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCollectTask, collectQcMetric, type CollectTaskV14 } from "../aggregators/emrQcMetricCollectV14Aggregator.js";

const demoTasks: CollectTaskV14[] = [
  buildCollectTask("病历完整率采集", "EMR系统"),
  buildCollectTask("缺陷率采集", "EMR系统"),
  buildCollectTask("及时率采集", "EMR系统"),
];

const demoResults = demoTasks.map((t, i) => collectQcMetric(t, [1000, 500, 800][i] ?? 0));

export const emrQcMetricCollectV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-metric-collect",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-metric-collect:read");
      if (denied) return denied;
      return json(ok({ tasks: demoTasks, results: demoResults }));
    },
  },
];
