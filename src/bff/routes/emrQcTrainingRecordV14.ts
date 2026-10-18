/**
 * 健澜科技 jlmedaios - 质控培训记录 V14 路由（M503-D，M503 收官）
 *
 * GET /api/v1/emr-qc-training-record  （read，auth:true）返回培训记录
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateTrainingRecord, buildTrainingRecord, type TrainingRecordV14 } from "../aggregators/emrQcTrainingRecordV14Aggregator.js";

const sampleRecords: TrainingRecordV14[] = [
  buildTrainingRecord("张医生", "病历书写规范", "2026-10-15"),
  buildTrainingRecord("李医生", "质控核心制度", "2026-10-16"),
  buildTrainingRecord("张医生", "质控核心制度", "2026-10-17"),
];

const aggregate = aggregateTrainingRecord(sampleRecords);

export const emrQcTrainingRecordV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-training-record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-training-record:read");
      if (denied) return denied;
      return json(ok({ records: sampleRecords, aggregate }));
    },
  },
];
