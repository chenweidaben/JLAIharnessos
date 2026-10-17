/**
 * 健澜科技 jlmedaios - 质量门禁总览 V13 单测（M299-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQualityGateDashboardV13,
  computeQualityPassRateV13,
  identifyQualityRiskV13,
} from "../../src/bff/aggregators/qualityGateV13Aggregator";
import { qualityGateV13Routes } from "../../src/bff/routes/qualityGateV13";

describe("buildQualityGateDashboardV13", () => {
  it("3待审/4通过/1驳回/1回滚/2评审", () => {
    const d = buildQualityGateDashboardV13(
      [1, 2, 3], [10, 11, 12, 13], [20], [30], [{ id: "d-1" }, { id: "d-4" }],
    );
    expect(d.pendingCount).toBe(3);
    expect(d.approvedCount).toBe(4);
    expect(d.rejectedCount).toBe(1);
    expect(d.rolledbackCount).toBe(1);
    expect(d.reviewerCount).toBe(2);
  });
  it("空态 → 全0", () => {
    const d = buildQualityGateDashboardV13([], [], [], [], []);
    expect(d.pendingCount).toBe(0);
  });
});

describe("computeQualityPassRateV13", () => {
  it("4通过 1驳回 → 4/(4+1)*100 = 80", () => {
    expect(computeQualityPassRateV13(4, 1)).toBe(80);
  });
  it("0+0 → 0", () => {
    expect(computeQualityPassRateV13(0, 0)).toBe(0);
  });
});

describe("identifyQualityRiskV13", () => {
  it("rejected=1 approved=4 → 无风险", () => {
    const d = buildQualityGateDashboardV13([1, 2, 3], [10, 11, 12, 13], [20], [30], [{ id: "x" }]);
    expect(identifyQualityRiskV13(d)).toBe("");
  });
  it("rejected=5 approved=2 → '经验质量堪忧'", () => {
    const d = buildQualityGateDashboardV13([], [1, 2], [1, 2, 3, 4, 5], [], []);
    expect(identifyQualityRiskV13(d)).toContain("经验质量堪忧");
  });
  it("pending=15 → '评审积压'", () => {
    const d = buildQualityGateDashboardV13(new Array(15).fill(1), [10], [1], [], []);
    expect(identifyQualityRiskV13(d)).toContain("评审积压");
  });
});

describe("qualityGateV13Routes 读路由", () => {
  it("GET /api/v1/quality-gate 路由存在且 auth:true", () => {
    const route = qualityGateV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/quality-gate",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
