/**
 * 健澜科技 jlmedaios - 档案管理 V13 路由（M450-C，宣传与党建管理组）
 *
 * GET /api/v1/archive-mgmt
 *
 * 权限：archive-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeArchiveDigitizationRateV13,
  computeArchiveIntegrityRateV13,
  computeArchiveTimelyFilingRateV13,
  type ArchiveMgmtRecordV13,
} from "../aggregators/archiveMgmtV13Aggregator.js";

const records: ArchiveMgmtRecordV13[] = [
  { timely: 950, shouldFiling: 1000, complete: 900, totalArchive: 1000, digitized: 980 },
  { timely: 950, shouldFiling: 1000, complete: 900, totalArchive: 1000, digitized: 980 },
];

export const archiveMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/archive-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "archive-mgmt:read");
      if (denied) return denied;
      return json(ok({
        archiveTimelyFilingRate: computeArchiveTimelyFilingRateV13(records),
        archiveIntegrityRate: computeArchiveIntegrityRateV13(records),
        archiveDigitizationRate: computeArchiveDigitizationRateV13(records),
      }));
    },
  },
];
