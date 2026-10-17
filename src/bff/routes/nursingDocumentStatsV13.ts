/**
 * 健澜科技 jlmedaios - 护理文书统计 V13 路由（M376-B，stats 避让）
 *
 * GET /api/v1/nursing-document-stats
 *
 * 权限：nursing-document-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNursingDocumentTimelyRateV13,
  computeNursingRecordCompletenessRateV13,
  computeNursingWritingPassRateV13,
  type NursingDocumentRecordV13,
} from "../aggregators/nursingDocumentStatsV13Aggregator.js";

const records: NursingDocumentRecordV13[] = [
  { writingCheckCount: 100, writingPassCount: 98, recordCount: 100, recordCompleteCount: 97, shouldWriteCount: 100, timelyWriteCount: 99 },
  { writingCheckCount: 100, writingPassCount: 98, recordCount: 100, recordCompleteCount: 97, shouldWriteCount: 100, timelyWriteCount: 99 },
];

export const nursingDocumentStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-document-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-document-stats:read");
      if (denied) return denied;
      return json(ok({
        nursingWritingPassRate: computeNursingWritingPassRateV13(records),
        nursingRecordCompletenessRate: computeNursingRecordCompletenessRateV13(records),
        nursingDocumentTimelyRate: computeNursingDocumentTimelyRateV13(records),
      }));
    },
  },
];
