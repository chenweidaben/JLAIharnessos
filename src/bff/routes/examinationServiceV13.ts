/**
 * 健澜科技 jlmedaios - 检查服务 V13 路由（M374-A）
 *
 * GET /api/v1/examination-service
 *
 * 权限：examination-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCtExaminationCountV13,
  computeMriExaminationCountV13,
  computeUltrasoundExaminationCountV13,
  type ExaminationServiceRecordV13,
} from "../aggregators/examinationServiceV13Aggregator.js";

const records: ExaminationServiceRecordV13[] = [
  { ctCount: 100, mriCount: 50, ultrasoundCount: 300 },
  { ctCount: 100, mriCount: 50, ultrasoundCount: 300 },
];

export const examinationServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/examination-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "examination-service:read");
      if (denied) return denied;
      return json(ok({
        ctExaminationCount: computeCtExaminationCountV13(records),
        mriExaminationCount: computeMriExaminationCountV13(records),
        ultrasoundExaminationCount: computeUltrasoundExaminationCountV13(records),
      }));
    },
  },
];
