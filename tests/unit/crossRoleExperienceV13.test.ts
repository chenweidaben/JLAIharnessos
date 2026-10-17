/**
 * 健澜科技 jlmedaios - 跨角色经验安全复用 V13 单测（M295-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCrossRoleExperienceV13,
  filterByRoleV13,
  scoreTransferabilityV13,
  type ExperienceV13,
} from "../../src/bff/aggregators/crossRoleExperienceV13Aggregator";
import { crossRoleExperienceV13Routes } from "../../src/bff/routes/crossRoleExperienceV13";

const expDoc: ExperienceV13 = {
  experienceId: "exp-1",
  sourceRole: "doctor",
  title: "房颤合并华法林",
  condition: "房颤",
  action: "诊断后开华法林抗凝",
  diseaseRelevance: 90,
  actionExecutable: 80,
  riskLevel: 70,
};

const expLow: ExperienceV13 = {
  experienceId: "exp-2",
  sourceRole: "doctor",
  title: "术后低体温",
  condition: "术后",
  action: "术中保温",
  diseaseRelevance: 60,
  actionExecutable: 30,
  riskLevel: 50,
};

const expPharma: ExperienceV13 = {
  experienceId: "exp-3",
  sourceRole: "pharma",
  title: "阿司匹林+华法林",
  condition: "抗凝",
  action: "审核出血风险",
  diseaseRelevance: 85,
  actionExecutable: 90,
  riskLevel: 80,
};

describe("scoreTransferabilityV13", () => {
  it("expDoc: 90*0.4+80*0.4+70*0.2 = 82", () => {
    expect(scoreTransferabilityV13(expDoc)).toBe(82);
  });
  it("expLow: 60*0.4+30*0.4+50*0.2 = 46", () => {
    expect(scoreTransferabilityV13(expLow)).toBe(46);
  });
});

describe("buildCrossRoleExperienceV13", () => {
  it("doctor→nurse: title 加【护士观察】前缀", () => {
    const r = buildCrossRoleExperienceV13("doctor", "nurse", expDoc);
    expect(r.adaptedTitle).toBe("【护士观察】房颤合并华法林");
    expect(r.transferabilityScore).toBe(82);
  });
  it("doctor→pharma: title 加【药师审核】前缀", () => {
    const r = buildCrossRoleExperienceV13("doctor", "pharma", expDoc);
    expect(r.adaptedTitle).toBe("【药师审核】房颤合并华法林");
  });
});

describe("filterByRoleV13", () => {
  it("targetRole=nurse：expDoc(82)✓ expLow(46<50)✗ expPharma(86)✓ → 2条", () => {
    const list = filterByRoleV13([expDoc, expLow, expPharma], "nurse");
    expect(list.length).toBe(2);
    expect(list.map((e) => e.experienceId).sort()).toEqual(["exp-1", "exp-3"]);
  });
  it("空态→0", () => {
    expect(filterByRoleV13([], "nurse").length).toBe(0);
  });
});

describe("crossRoleExperienceV13Routes 读路由", () => {
  it("GET /api/v1/cross-role-experience 路由存在且 auth:true", () => {
    const route = crossRoleExperienceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/cross-role-experience",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
