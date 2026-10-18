/**
 * 健澜科技 jlmedaios - 模板版本审核工作流 V14 单测（M461-C）
 *
 * 测试 canApprove pending_review / canApprove 已 approved 不可重复 / buildReviewComment approve / buildReviewComment reject / 读路由 GET auth:true。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReviewComment,
  canApprove,
  type ReviewRecordV14,
} from "../../src/bff/aggregators/emrTemplateReviewV14Aggregator";
import { emrTemplateReviewV14Routes } from "../../src/bff/routes/emrTemplateReviewV14";
import type { RouteDef } from "../../src/bff/types";

const pendingRecord: ReviewRecordV14 = {
  id: "R001",
  templateName: "通用住院模板",
  version: "v2.1",
  status: "pending_review",
  submitter: "王医生",
  submittedAt: "2026-10-18T08:00:00Z",
};

describe("canApprove pending_review", () => {
  it("pending_review 记录 → approve=true", () => {
    const result = canApprove(pendingRecord);
    expect(result.approve).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe("canApprove 已 approved", () => {
  // 手算：已 approved → approve=false，reason 提示"不可重复操作"
  it("已 approved 记录 → approve=false，reason 提示不可重复操作", () => {
    const approvedRecord: ReviewRecordV14 = { ...pendingRecord, status: "approved", reviewer: "张医生" };
    const result = canApprove(approvedRecord);
    expect(result.approve).toBe(false);
    expect(result.reason).toContain("不可重复操作");
  });
});

describe("buildReviewComment approve", () => {
  it("buildReviewComment('approve', '张医生') 生成含审核人字样的意见", () => {
    const comment = buildReviewComment("approve", "张医生");
    expect(comment).toContain("批准");
    expect(comment).toContain("张医生");
  });
});

describe("buildReviewComment reject", () => {
  it("buildReviewComment('reject', '李医生', '字段不全') 生成含驳回原因的意见", () => {
    const comment = buildReviewComment("reject", "李医生", "字段不全");
    expect(comment).toContain("驳回");
    expect(comment).toContain("李医生");
    expect(comment).toContain("字段不全");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-review auth:true", () => {
    const def = (emrTemplateReviewV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-review");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
