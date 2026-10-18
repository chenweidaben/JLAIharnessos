/**
 * 健澜科技 jlmedaios - 质控患者满意度调查 V14 路由（M504-D，M504 收官）
 *
 * GET  /api/v1/emr-qc-patient-satisfaction  （read，auth:true）返回满意度统计
 * POST /api/v1/emr-qc-patient-satisfaction  （auth:true）提交满意度调查
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateSatisfaction,
  buildSurvey,
  submitSurvey,
  type PatientSurveyV14,
} from "../aggregators/emrQcPatientSatisfactionV14Aggregator.js";

let sampleSurveys: PatientSurveyV14[] = [
  buildSurvey("王患者", 95, "服务很好"),
  buildSurvey("李患者", 88, "基本满意"),
  buildSurvey("张患者", 92, "医生很专业"),
];

export const emrQcPatientSatisfactionV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-patient-satisfaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-patient-satisfaction:read");
      if (denied) return denied;
      const aggregate = aggregateSatisfaction(sampleSurveys);
      return json(ok({ surveys: sampleSurveys, aggregate }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-patient-satisfaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-patient-satisfaction:write");
      if (denied) return denied;
      const body = await c.req.json();
      const patient = typeof body?.patient === "string" ? body.patient : "";
      const score = typeof body?.score === "number" ? body.score : 0;
      const comment = typeof body?.comment === "string" ? body.comment : "";
      const survey = buildSurvey(patient, score, comment);
      sampleSurveys = submitSurvey(sampleSurveys, survey);
      const aggregate = aggregateSatisfaction(sampleSurveys);
      return json(ok({ surveys: sampleSurveys, aggregate }));
    },
  },
];
