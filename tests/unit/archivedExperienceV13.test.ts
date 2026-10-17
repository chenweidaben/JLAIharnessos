/**
 * 健澜科技 jlmedaios - 退役经验存档与复用 V13 单测（M305-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  archiveRetiredExperienceV13,
  resurrectExperienceV13,
  searchArchivedV13,
  type ArchivedExpV13,
} from "../../src/bff/aggregators/archivedExperienceV13Aggregator";
import { archivedExperienceV13Routes } from "../../src/bff/routes/archivedExperienceV13";

const archivedList: ArchivedExpV13[] = [
  archiveRetiredExperienceV13({ experienceId: "e-1", title: "房颤华法林", status: "retired", retireReason: "陈旧", version: 3 }),
  archiveRetiredExperienceV13({ experienceId: "e-2", title: "旧版阿司匹林", status: "retired", retireReason: "副作用大", version: 1 }),
  archiveRetiredExperienceV13({ experienceId: "e-3", title: "华法林禁忌", status: "retired", retireReason: "被新指南取代", version: 2 }),
];

describe("archiveRetiredExperienceV13", () => {
  it("retired → archived", () => {
    expect(archivedList[0].status).toBe("archived");
    expect(archivedList[0].retireReason).toBe("陈旧");
  });
});

describe("searchArchivedV13", () => {
  // 算式：搜"华法林" → e-1(房颤华法林) + e-3(华法林禁忌) = 2 条命中
  it("q=华法林 → 2 条", () => {
    const r = searchArchivedV13("华法林", archivedList);
    expect(r.length).toBe(2);
  });
  it("空态 q='' → 0", () => {
    expect(searchArchivedV13("", archivedList).length).toBe(0);
  });
});

describe("resurrectExperienceV13", () => {
  // 算式：e-1 version=3 + 新证据 → version=4, status=active
  it("新证据 → active, version+1", () => {
    const r = resurrectExperienceV13(archivedList[0], "新RCT证实");
    expect(r.status).toBe("active");
    expect(r.version).toBe(4);
  });
  it("无新证据 → 保持 archived", () => {
    const r = resurrectExperienceV13(archivedList[0], "");
    expect(r.status).toBe("archived");
  });
});

describe("archivedExperienceV13Routes 读路由", () => {
  it("GET /api/v1/archived-experience 路由存在且 auth:true", () => {
    const route = archivedExperienceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/archived-experience",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
