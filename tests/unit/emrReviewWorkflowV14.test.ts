/**
 * 健澜科技 jlmedaios - 病历审核工作流 V14 单测（M478-A）
 *
 * 测试 transitionReviewStatus 状态流转、buildReviewWorkflow 构建、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReviewWorkflow,
  transitionReviewStatus,
} from "../../src/bff/aggregators/emrReviewWorkflowV14Aggregator";
import { emrReviewWorkflowV14Routes } from "../../src/bff/routes/emrReviewWorkflowV14";
import type { RouteDef } from "../../src/bff/types";

describe("transitionReviewStatus pending→reviewing", () => {
  // 手算：pending + action='submit' → reviewing
  it("pending + action='submit' → 'reviewing'", () => {
    expect(transitionReviewStatus("pending", "submit")).toBe("reviewing");
  });
});

describe("transitionReviewStatus reviewing→approved", () => {
  // 手算：reviewing + action='approve' → approved
  it("reviewing + action='approve' → 'approved'", () => {
    expect(transitionReviewStatus("reviewing", "approve")).toBe("approved");
  });
});

describe("transitionReviewStatus reviewing→rejected", () => {
  // 手算：reviewing + action='reject' → rejected
  it("reviewing + action='reject' → 'rejected'", () => {
    expect(transitionReviewStatus("reviewing", "reject")).toBe("rejected");
  });
});

describe("buildReviewWorkflow 构建", () => {
  // 手算：medicalRecordId='MR001', currentStatus='pending' → 正确构建
  it("medicalRecordId=MR001, currentStatus=pending → 正确构建", () => {
    const workflow = buildReviewWorkflow("MR001", "pending");
    expect(workflow.medicalRecordId).toBe("MR001");
    expect(workflow.currentStatus).toBe("pending");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-review-workflow auth:true", () => {
    const def = (emrReviewWorkflowV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-review-workflow");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
