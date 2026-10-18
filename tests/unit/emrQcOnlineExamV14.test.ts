/**
 * 健澜科技 jlmedaios - 质控在线考试 V14 单测（M503-B）
 *
 * 测试 submitExam 提交、gradeExam 等级评定、buildExamReport 构建报告、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExamReport,
  gradeExam,
  submitExam,
  type OnlineExamV14,
} from "../../src/bff/aggregators/emrQcOnlineExamV14Aggregator";
import { emrQcOnlineExamV14Routes } from "../../src/bff/routes/emrQcOnlineExamV14";
import type { RouteDef } from "../../src/bff/types";

describe("submitExam 张医生", () => {
  // 手算：user='张医生', score=92 → 正确构建
  it("user='张医生', score=92 → 正确构建", () => {
    const exam: OnlineExamV14 = submitExam("张医生", 92);
    expect(exam.user).toBe("张医生");
    expect(exam.score).toBe(92);
  });
});

describe("gradeExam 优秀", () => {
  // 手算：score=95 → '优秀'（>=90）
  it("score=95 → '优秀'", () => {
    const grade = gradeExam(95);
    expect(grade).toBe("优秀");
  });
});

describe("gradeExam 及格", () => {
  // 手算：score=75 → '及格'（60-79）
  it("score=75 → '及格'", () => {
    const grade = gradeExam(75);
    expect(grade).toBe("及格");
  });
});

describe("buildExamReport 三人考试", () => {
  // 手算：3 人考试（92/85/58）
  // total = 3
  // avgScore = (92+85+58)/3 = 235/3 ≈ 78.3
  // passCount = 2（92和85 >=60，58 <60）
  // passRate = Math.ceil(2/3*100) = Math.ceil(66.67) = 67
  it("3 人考试（92/85/58）→ total=3, avgScore=78.3, passRate=67", () => {
    const exams: OnlineExamV14[] = [
      submitExam("张医生", 92),
      submitExam("李医生", 85),
      submitExam("王医生", 58),
    ];
    const report = buildExamReport(exams);
    expect(report.total).toBe(3);
    expect(report.avgScore).toBeCloseTo(78.3);
    expect(report.passRate).toBe(67);
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-online-exam auth:true", () => {
    const def = (emrQcOnlineExamV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-online-exam");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
