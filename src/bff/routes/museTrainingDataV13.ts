/**
 * 健澜科技 jlmedaios - 个人智能体训练数据沉淀 V13 路由（M319-D）
 *
 * GET /api/v1/muse-training-data?doctorId=
 *
 * 权限：muse-training-data:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTrainingFlywheelV13,
  computeSuccessFailureRatioV13,
  countTrainingSamplesV13,
  type TrainingRecordV13,
} from "../aggregators/museTrainingDataV13Aggregator.js";

const records: TrainingRecordV13[] = [
  { recordId: "r1", doctorId: "D01", week: "W1", isSuccess: true },
  { recordId: "r2", doctorId: "D01", week: "W1", isSuccess: false },
  { recordId: "r3", doctorId: "D01", week: "W2", isSuccess: true },
  { recordId: "r4", doctorId: "D01", week: "W2", isSuccess: true },
  { recordId: "r5", doctorId: "D01", week: "W2", isSuccess: false },
  { recordId: "r6", doctorId: "D01", week: "W3", isSuccess: true },
  { recordId: "r7", doctorId: "D01", week: "W3", isSuccess: true },
  { recordId: "r8", doctorId: "D01", week: "W3", isSuccess: true },
  { recordId: "r9", doctorId: "D01", week: "W4", isSuccess: true },
  { recordId: "r10", doctorId: "D01", week: "W4", isSuccess: false },
];

export const museTrainingDataV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-training-data",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-training-data:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const doctorId = url.searchParams.get("doctorId") ?? "D01";
      const filtered = records.filter((r) => r.doctorId === doctorId);
      return json(ok({
        doctorId,
        totalSamples: countTrainingSamplesV13(filtered),
        successRate: computeSuccessFailureRatioV13(filtered),
        flywheelTrend: buildTrainingFlywheelV13(filtered),
      }));
    },
  },
];
