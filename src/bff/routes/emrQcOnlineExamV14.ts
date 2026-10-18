/**
 * 健澜科技 jlmedaios - 质控在线考试 V14 路由（M503-B）
 *
 * POST /api/v1/emr-qc-online-exam  （auth:true）在线考试提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildExamReport, gradeExam, submitExam, type OnlineExamV14 } from "../aggregators/emrQcOnlineExamV14Aggregator.js";

let sampleExams: OnlineExamV14[] = [
  submitExam("张医生", 92),
  submitExam("李医生", 85),
  submitExam("王医生", 58),
];

export const emrQcOnlineExamV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-online-exam",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-online-exam:write");
      if (denied) return denied;
      const body = await c.req.json();
      const user = typeof body?.user === "string" ? body.user : "";
      const score = typeof body?.score === "number" ? body.score : 0;
      const exam = submitExam(user, score);
      sampleExams = [...sampleExams, exam];
      const report = buildExamReport(sampleExams);
      const grade = gradeExam(score);
      return json(ok({ exam, grade, report }));
    },
  },
];
