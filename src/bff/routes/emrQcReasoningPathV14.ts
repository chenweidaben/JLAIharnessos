/**
 * 健澜科技 jlmedaios - 质控知识推理路径 V14 路由（M489-C）
 *
 * GET /api/v1/emr-qc-reasoning-path  （read，auth:true）返回推理路径数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildReasoningPath, findReasoningPaths } from "../aggregators/emrQcReasoningPathV14Aggregator.js";

const sampleRelations = [
  { source: "糖尿病", target: "高血糖" },
  { source: "高血糖", target: "胰岛素抵抗" },
  { source: "糖尿病", target: "并发症" },
];

export const emrQcReasoningPathV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-reasoning-path",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-reasoning-path:read");
      if (denied) return denied;
      const path = buildReasoningPath("P001", ["糖尿病", "高血糖", "胰岛素抵抗"], ["糖尿病→高血糖", "高血糖→胰岛素抵抗"]);
      const result = findReasoningPaths("糖尿病", "胰岛素抵抗", sampleRelations);
      return json(ok({ path, result }));
    },
  },
];
