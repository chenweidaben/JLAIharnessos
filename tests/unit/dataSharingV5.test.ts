/**
 * 健澜科技 jlmedaios - 院间数据共享授权 V5 单测（M281-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDataSharingV5Report,
  checkConsentV5,
  grantConsentV5,
  revokeConsentV5,
  type SharingAudit,
} from "../../src/bff/aggregators/dataSharingV5Aggregator";
import { dataSharingV5Routes } from "../../src/bff/routes/dataSharingV5";

describe("grantConsentV5", () => {
  it("生成granted=true的授权", () => {
    const c = grantConsentV5("p-1", { requesterOrg: "外院A", reason: "会诊" }, ["Patient", "Condition"], 30);
    expect(c.granted).toBe(true);
    expect(c.resourcesScope).toContain("Patient");
  });
});

describe("checkConsentV5", () => {
  it("资源在范围内→允许", () => {
    const c = grantConsentV5("p-1", { requesterOrg: "A", reason: "r" }, ["Patient", "Condition"], 30);
    expect(checkConsentV5(c, "Patient")).toBe(true);
  });
  it("资源不在范围内→拒绝", () => {
    const c = grantConsentV5("p-1", { requesterOrg: "A", reason: "r" }, ["Patient"], 30);
    expect(checkConsentV5(c, "Observation")).toBe(false);
  });
});

describe("revokeConsentV5", () => {
  it("撤回后granted=false且revokedAt非空", () => {
    const c = grantConsentV5("p-1", { requesterOrg: "A", reason: "r" }, ["Patient"], 30);
    const r = revokeConsentV5(c);
    expect(r.granted).toBe(false);
    expect(r.revokedAt).not.toBeNull();
  });
});

describe("buildDataSharingV5Report", () => {
  it("统计有效与撤回", () => {
    const c1 = grantConsentV5("p-1", { requesterOrg: "A", reason: "r" }, ["Patient"], 30);
    const c2 = revokeConsentV5(grantConsentV5("p-2", { requesterOrg: "B", reason: "r" }, ["Patient"], 30));
    const audits: SharingAudit[] = [{ consentId: c1.id, accessedBy: "A", resource: "Patient" }];
    const r = buildDataSharingV5Report([c1, c2], audits);
    expect(r.activeCount).toBe(1);
    expect(r.revokedCount).toBe(1);
    expect(r.auditCount).toBe(1);
  });
});

describe("dataSharingV5Routes 写权限", () => {
  it("POST /api/v1/data-sharing/consent 路由存在且 auth:true", () => {
    const post = dataSharingV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/data-sharing/consent");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
