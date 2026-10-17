/**
 * 健澜科技 jlmedaios - 病案归档管理 V13 路由（M420-A，archive 维度避让旧版 medicalRecordMgmtV13/medicalRecordDetailV13）
 *
 * GET /api/v1/medical-record-archive-mgmt
 *
 * 权限：medical-record-archive-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalRecordArchiveTimelyRateV13,
  computeMedicalRecordBorrowReturnRateV13,
  computeMedicalRecordStockTurnoverRateV13,
  type MedicalRecordArchiveMgmtRecordV13,
} from "../aggregators/medicalRecordArchiveMgmtV13Aggregator.js";

const records: MedicalRecordArchiveMgmtRecordV13[] = [
  { archiveTimely: 980, archiveShould: 1000, stockBorrowReturn: 950, stockTotal: 1000, borrowReturnOnTime: 990, borrowTotal: 1000 },
  { archiveTimely: 980, archiveShould: 1000, stockBorrowReturn: 950, stockTotal: 1000, borrowReturnOnTime: 990, borrowTotal: 1000 },
];

export const medicalRecordArchiveMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-record-archive-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-record-archive-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalRecordArchiveTimelyRate: computeMedicalRecordArchiveTimelyRateV13(records),
        medicalRecordStockTurnoverRate: computeMedicalRecordStockTurnoverRateV13(records),
        medicalRecordBorrowReturnRate: computeMedicalRecordBorrowReturnRateV13(records),
      }));
    },
  },
];
