/**
 * 健澜科技 jlmedaios - 终末质控 V14 单测（M480-D，M480 收官）
 *
 * 测试 buildTerminalQc 构建、submitTerminalQc 提交、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTerminalQc,
  submitTerminalQc,
  type TerminalQcV14,
} from "../../src/bff/aggregators/emrTerminalQcV14Aggregator";
import { emrTerminalQcV14Routes } from "../../src/bff/routes/emrTerminalQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTerminalQc 内科", () => {
  // 手算：medicalRecordId='MR001', dept='内科' → 正确构建
  it("medicalRecordId=MR001, dept=内科 → 正确构建", () => {
    const record: TerminalQcV14 = buildTerminalQc("MR001", "内科");
    expect(record.medicalRecordId).toBe("MR001");
    expect(record.dept).toBe("内科");
  });
});

describe("submitTerminalQc 通过", () => {
  // 手算：score=90, passed=true → 提交记录含 submittedAt
  it("score=90, passed=true → 提交记录含 submittedAt", () => {
    const record: TerminalQcV14 = buildTerminalQc("MR001", "内科");
    const submission = submitTerminalQc(record, { score: 90, passed: true });
    expect(submission.score).toBe(90);
    expect(submission.passed).toBe(true);
    expect(submission).toHaveProperty("submittedAt");
  });
});

describe("submitTerminalQc 不通过", () => {
  // 手算：score=60, passed=false → 提交记录含 submittedAt
  it("score=60, passed=false → 提交记录含 submittedAt", () => {
    const record: TerminalQcV14 = buildTerminalQc("MR002", "外科");
    const submission = submitTerminalQc(record, { score: 60, passed: false });
    expect(submission.score).toBe(60);
    expect(submission.passed).toBe(false);
    expect(submission).toHaveProperty("submittedAt");
  });
});

describe("buildTerminalQc 外科", () => {
  // 手算：dept='外科' → 正确构建
  it("dept=外科 → 正确构建", () => {
    const record: TerminalQcV14 = buildTerminalQc("MR002", "外科");
    expect(record.dept).toBe("外科");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-terminal-qc auth:true", () => {
    const def = (emrTerminalQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-terminal-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
