/**
 * 健澜科技 jlmedaios - 医患沟通管理 V13 路由（M451-A，医患关系与投诉管理组）
 *
 * GET /api/v1/doctor-patient-communication-mgmt
 *
 * 权限：doctor-patient-communication-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDoctorPatientCommunicationComplaintOccurrenceRateV13,
  computeDoctorPatientCommunicationInformedConsentSignRateV13,
  computeDoctorPatientCommunicationRecordCompletenessRateV13,
  type DoctorPatientCommunicationMgmtRecordV13,
} from "../aggregators/doctorPatientCommunicationMgmtV13Aggregator.js";

const records: DoctorPatientCommunicationMgmtRecordV13[] = [
  { complete: 950, totalRecord: 1000, signed: 900, shouldSign: 1000, complaint: 30, totalCommunication: 1000 },
  { complete: 950, totalRecord: 1000, signed: 900, shouldSign: 1000, complaint: 30, totalCommunication: 1000 },
];

export const doctorPatientCommunicationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/doctor-patient-communication-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "doctor-patient-communication-mgmt:read");
      if (denied) return denied;
      return json(ok({
        doctorPatientCommunicationRecordCompletenessRate: computeDoctorPatientCommunicationRecordCompletenessRateV13(records),
        doctorPatientCommunicationInformedConsentSignRate: computeDoctorPatientCommunicationInformedConsentSignRateV13(records),
        doctorPatientCommunicationComplaintOccurrenceRate: computeDoctorPatientCommunicationComplaintOccurrenceRateV13(records),
      }));
    },
  },
];
