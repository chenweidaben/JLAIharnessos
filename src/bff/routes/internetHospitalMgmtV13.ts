/**
 * 健澜科技 jlmedaios - 互联网医院管理 V13 路由（M459-C，医院运营与健康管理组）
 *
 * GET /api/v1/internet-hospital-mgmt
 *
 * 权限：internet-hospital-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInternetHospitalOnlineConsultationCountV13,
  computeInternetHospitalOnlinePrescriptionRateV13,
  computeInternetHospitalReconsultationResponseMinutesV13,
  type InternetHospitalMgmtRecordV13,
} from "../aggregators/internetHospitalMgmtV13Aggregator.js";

const records: InternetHospitalMgmtRecordV13[] = [
  { consultationCount: 950, prescribed: 900, totalConsultation: 1000, responseMinutes: 15 },
  { consultationCount: 950, prescribed: 900, totalConsultation: 1000, responseMinutes: 15 },
];

export const internetHospitalMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/internet-hospital-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "internet-hospital-mgmt:read");
      if (denied) return denied;
      return json(ok({
        internetHospitalOnlineConsultationCount: computeInternetHospitalOnlineConsultationCountV13(records),
        internetHospitalOnlinePrescriptionRate: computeInternetHospitalOnlinePrescriptionRateV13(records),
        internetHospitalReconsultationResponseMinutes: computeInternetHospitalReconsultationResponseMinutesV13(records),
      }));
    },
  },
];
