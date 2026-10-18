/**
 * 健澜科技 jlmedaios - 质控考核证书 V14 路由（M503-C）
 *
 * GET /api/v1/emr-qc-exam-certificate  （read，auth:true）返回事核证书
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCertificate, verifyCertificate, type ExamCertificateV14 } from "../aggregators/emrQcExamCertificateV14Aggregator.js";

const sampleCert: ExamCertificateV14 = buildCertificate("张医生", "病历书写规范考核", 92);
const verifyResult = verifyCertificate(sampleCert);

export const emrQcExamCertificateV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-exam-certificate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-exam-certificate:read");
      if (denied) return denied;
      return json(ok({ certificate: sampleCert, verify: verifyResult }));
    },
  },
];
