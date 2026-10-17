/**
 * 健澜科技 jlmedaios - 患者身份识别 V13 路由（M394-C）
 *
 * GET /api/v1/patient-identification
 *
 * 权限：patient-identification:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePatientIdentificationCorrectRateV13,
  computeTransfusionDoubleCheckCorrectRateV13,
  computeWristbandWearingRateV13,
  type PatientIdentificationRecordV13,
} from "../aggregators/patientIdentificationV13Aggregator.js";

const records: PatientIdentificationRecordV13[] = [
  { correctCount: 980, totalCount: 1000, wristbandWornCount: 950, wristbandShouldCount: 1000, transfusionCheckCorrectCount: 990, transfusionTotalCount: 1000 },
  { correctCount: 980, totalCount: 1000, wristbandWornCount: 950, wristbandShouldCount: 1000, transfusionCheckCorrectCount: 990, transfusionTotalCount: 1000 },
];

export const patientIdentificationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-identification",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-identification:read");
      if (denied) return denied;
      return json(ok({
        patientIdentificationCorrectRate: computePatientIdentificationCorrectRateV13(records),
        wristbandWearingRate: computeWristbandWearingRateV13(records),
        transfusionDoubleCheckCorrectRate: computeTransfusionDoubleCheckCorrectRateV13(records),
      }));
    },
  },
];
