/**
 * 健澜科技 jlmedaios - 病历缺陷反馈与整改闭环 V14 单测（M464-D）
 *
 * 测试 buildFeedback feedbackId 含 defectId、初始 status='open'、trackRemediationStatus 状态计数、空数组→全0、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildFeedback,
  trackRemediationStatus,
  type FeedbackRecordV14,
} from "../../src/bff/aggregators/emrDefectFeedbackV14Aggregator";
import { emrDefectFeedbackV14Routes } from "../../src/bff/routes/emrDefectFeedbackV14";
import type { RouteDef } from "../../src/bff/types";

const defectInput = {
  defectId: "D001",
  noteId: "N001",
  writer: "张医生",
  feedback: "已补充主诉",
};

describe("buildFeedback feedbackId 含 defectId", () => {
  // 手算：feedbackId = "FB-D001"，含 "D001"
  it("feedbackId 含 defectId", () => {
    const record = buildFeedback(defectInput);
    expect(record.feedbackId).toContain("D001");
  });
});

describe("buildFeedback 初始 status", () => {
  // 手算：初始 status 固定为 'open'
  it("初始 status='open'", () => {
    const record = buildFeedback(defectInput);
    expect(record.status).toBe("open");
  });
});

describe("trackRemediationStatus 状态计数", () => {
  // 手算：1 open + 1 resolving + 2 closed → open=1, resolving=1, closed=2, total=4
  it("1 open + 1 resolving + 2 closed → 正确计数", () => {
    const records: FeedbackRecordV14[] = [
      { feedbackId: "FB-D1", defectId: "D1", noteId: "N1", writer: "w1", feedback: "f1", status: "open", createdAt: "2026-10-18T00:00:00Z" },
      { feedbackId: "FB-D2", defectId: "D2", noteId: "N2", writer: "w2", feedback: "f2", status: "resolving", createdAt: "2026-10-18T00:01:00Z" },
      { feedbackId: "FB-D3", defectId: "D3", noteId: "N3", writer: "w3", feedback: "f3", status: "closed", createdAt: "2026-10-18T00:02:00Z" },
      { feedbackId: "FB-D4", defectId: "D4", noteId: "N4", writer: "w4", feedback: "f4", status: "closed", createdAt: "2026-10-18T00:03:00Z" },
    ];
    const stats = trackRemediationStatus(records);
    expect(stats.open).toBe(1);
    expect(stats.resolving).toBe(1);
    expect(stats.closed).toBe(2);
    expect(stats.total).toBe(4);
  });
});

describe("trackRemediationStatus 空数组", () => {
  // 手算：空输入 → open=0, resolving=0, closed=0, total=0
  it("空数组 → 全 0", () => {
    const stats = trackRemediationStatus([]);
    expect(stats.open).toBe(0);
    expect(stats.resolving).toBe(0);
    expect(stats.closed).toBe(0);
    expect(stats.total).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-defect-feedback/:noteId auth:true", () => {
    const def = (emrDefectFeedbackV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-defect-feedback/:noteId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
