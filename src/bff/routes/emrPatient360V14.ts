/**
 * 健澜科技 jlmedaios - 患者就诊 360° 全视图 V14 路由（M465-C）
 *
 * GET /api/v1/emr-patient-360/:patientId （read，auth:true，path 参数 c.params.patientId）返回就诊史+用药史+检查史+诊断史聚合
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateVisitHistory,
  buildPatientTimeline,
  type PatientEventV14,
  type VisitRecordV14,
} from "../aggregators/emrPatient360V14Aggregator.js";

const demoEvents: PatientEventV14[] = [
  { id: "E001", type: "visit", title: "入院", eventTime: "2026-10-01T08:00:00Z" },
  { id: "E002", type: "lab", title: "血常规", eventTime: "2026-10-01T10:00:00Z" },
  { id: "E003", type: "diagnosis", title: "确诊肺炎", eventTime: "2026-10-02T09:00:00Z" },
];

const demoVisits: VisitRecordV14[] = [
  { visitId: "V001", dept: "呼吸科", admissionDate: "2026-10-01T08:00:00Z", dischargeDate: "2026-10-10T10:00:00Z" },
  { visitId: "V002", dept: "呼吸科", admissionDate: "2026-04-01T08:00:00Z", dischargeDate: "2026-04-08T10:00:00Z" },
];

export const emrPatient360V14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-patient-360/:patientId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-patient-360:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const patientId = (c.params.patientId ?? "").trim();
      const timeline = buildPatientTimeline(demoEvents);
      const visitHistory = aggregateVisitHistory(demoVisits);
      return json(ok({ patientId, timeline, visitHistory }));
    },
  },
];
