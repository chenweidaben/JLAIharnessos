/**
 * 健澜科技 jlmedaios - 质控考核证书 V14 单测（M503-C）
 *
 * 测试 buildCertificate 构建、verifyCertificate 验证、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCertificate,
  verifyCertificate,
  type ExamCertificateV14,
} from "../../src/bff/aggregators/emrQcExamCertificateV14Aggregator";
import { emrQcExamCertificateV14Routes } from "../../src/bff/routes/emrQcExamCertificateV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildCertificate 张医生", () => {
  // 手算：user='张医生', examName='病历书写规范考核', score=92 → 正确构建
  it("user='张医生', examName='病历书写规范考核', score=92 → 正确构建", () => {
    const cert: ExamCertificateV14 = buildCertificate("张医生", "病历书写规范考核", 92);
    expect(cert.user).toBe("张医生");
    expect(cert.examName).toBe("病历书写规范考核");
    expect(cert.score).toBe(92);
  });
});

describe("verifyCertificate 优秀", () => {
  // 手算：score=92 → valid=true, level='优秀'（>=90）
  it("score=92 → valid=true, level='优秀'", () => {
    const cert: ExamCertificateV14 = buildCertificate("张医生", "病历书写规范考核", 92);
    const result = verifyCertificate(cert);
    expect(result.valid).toBe(true);
    expect(result.level).toBe("优秀");
  });
});

describe("verifyCertificate 不及格", () => {
  // 手算：score=55 → valid=false, level='不及格'（<60 无效）
  it("score=55 → valid=false, level='不及格'", () => {
    const cert: ExamCertificateV14 = buildCertificate("王医生", "病历书写规范考核", 55);
    const result = verifyCertificate(cert);
    expect(result.valid).toBe(false);
    expect(result.level).toBe("不及格");
  });
});

describe("verifyCertificate 及格", () => {
  // 手算：score=75 → valid=true, level='及格'（60-79）
  it("score=75 → valid=true, level='及格'", () => {
    const cert: ExamCertificateV14 = buildCertificate("李医生", "病历书写规范考核", 75);
    const result = verifyCertificate(cert);
    expect(result.valid).toBe(true);
    expect(result.level).toBe("及格");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-exam-certificate auth:true", () => {
    const def = (emrQcExamCertificateV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-exam-certificate");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
