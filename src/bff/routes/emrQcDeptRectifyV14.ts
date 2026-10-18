/**
 * 健澜科技 jlmedaios - 质控科室整改跟踪 V14 路由（M493-D，M493 收官）
 *
 * GET /api/v1/emr-qc-dept-rectify  （read，auth:true）返回整改跟踪数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDeptRectify, trackDeptRectify, type DeptRectifyV14 } from "../aggregators/emrQcDeptRectifyV14Aggregator.js";

const sampleRecords: DeptRectifyV14[] = [
  buildDeptRectify("内科", "缺主诉", "整改中"),
  buildDeptRectify("外科", "超时限", "已完成"),
  buildDeptRectify("儿科", "缺诊断", "已完成"),
];

export const emrQcDeptRectifyV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dept-rectify",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-rectify:read");
      if (denied) return denied;
      const track = trackDeptRectify(sampleRecords);
      return json(ok({ records: sampleRecords, track }));
    },
  },
];
