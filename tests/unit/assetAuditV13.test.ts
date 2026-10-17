/**
 * 健澜科技 jlmedaios - 资产盘点周期 V13 单测（M305-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAuditChecklistV13,
  notifyDepartmentHeadV13,
  scheduleAssetAuditV13,
  type AuditExpV13,
} from "../../src/bff/aggregators/assetAuditV13Aggregator";
import { assetAuditV13Routes } from "../../src/bff/routes/assetAuditV13";

const stale: AuditExpV13[] = [
  { experienceId: "e-1", title: "房颤华法林", assetScore: 71 },
  { experienceId: "e-2", title: "旧版阿司匹林", assetScore: 15 },
  { experienceId: "e-3", title: "旧版降压", assetScore: 30 },
];

describe("scheduleAssetAuditV13", () => {
  // 算式：120>90 → true
  it("距上次120天 → 需盘点", () => {
    expect(scheduleAssetAuditV13(120)).toBe(true);
  });
  // 算式：60≤90 → false
  it("距上次60天 → 不需盘点", () => {
    expect(scheduleAssetAuditV13(60)).toBe(false);
  });
});

describe("buildAuditChecklistV13", () => {
  // 算式：按 assetScore 升序：e-2(15) → e-3(30) → e-1(71)
  it("升序排列：e-2 第一（15 最低）", () => {
    const checklist = buildAuditChecklistV13(stale);
    expect(checklist[0].experienceId).toBe("e-2");
    expect(checklist[1].experienceId).toBe("e-3");
    expect(checklist[2].experienceId).toBe("e-1");
  });
  it("空态 → 0", () => {
    expect(buildAuditChecklistV13([]).length).toBe(0);
  });
});

describe("notifyDepartmentHeadV13", () => {
  // 算式：3 条 → itemCount=3
  it("通知含条数 3", () => {
    const n = notifyDepartmentHeadV13(stale);
    expect(n.itemCount).toBe(3);
    expect(n.message).toContain("3");
  });
});

describe("assetAuditV13Routes 读路由", () => {
  it("GET /api/v1/asset-audit 路由存在且 auth:true", () => {
    const route = assetAuditV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/asset-audit",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
