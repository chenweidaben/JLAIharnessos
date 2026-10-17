/**
 * 健澜科技 jlmedaios - 药师 MUSE 工作台 V5 单测（M283-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMusePharmacistV5Report,
  buildPharmacistDailyV5,
  flagInteractionV5,
  prioritizeReviewV5,
  type Prescription,
} from "../../src/bff/aggregators/musePharmacistV5Aggregator";
import { musePharmacistV5Routes } from "../../src/bff/routes/musePharmacistV5";

describe("flagInteractionV5", () => {
  it("华法林+阿司匹林→有相互作用", () => {
    const rx: Prescription = { rxId: "r1", patientId: "p", drugs: ["华法林", "阿司匹林"], urgency: 5, isPediatric: false, isElderly: true };
    expect(flagInteractionV5(rx).hasInteraction).toBe(true);
  });
  it("阿莫西林→无相互作用", () => {
    const rx: Prescription = { rxId: "r2", patientId: "p", drugs: ["阿莫西林"], urgency: 3, isPediatric: true, isElderly: false };
    expect(flagInteractionV5(rx).hasInteraction).toBe(false);
  });
});

describe("prioritizeReviewV5", () => {
  it("有相互作用的处方排最前", () => {
    const queue: Prescription[] = [
      { rxId: "r1", patientId: "p", drugs: ["二甲双胍"], urgency: 5, isPediatric: false, isElderly: false },
      { rxId: "r2", patientId: "p", drugs: ["华法林", "阿司匹林"], urgency: 1, isPediatric: false, isElderly: false },
    ];
    expect(prioritizeReviewV5(queue)[0].rxId).toBe("r2");
  });
});

describe("buildPharmacistDailyV5", () => {
  it("3处方1相互作用1儿童", () => {
    const queue: Prescription[] = [
      { rxId: "r1", patientId: "p", drugs: ["华法林", "阿司匹林"], urgency: 5, isPediatric: false, isElderly: true },
      { rxId: "r2", patientId: "p", drugs: ["阿莫西林"], urgency: 3, isPediatric: true, isElderly: false },
      { rxId: "r3", patientId: "p", drugs: ["二甲双胍"], urgency: 1, isPediatric: false, isElderly: false },
    ];
    const r = buildPharmacistDailyV5("pharm-1", queue);
    expect(r.pendingCount).toBe(3);
    expect(r.interactionCount).toBe(1);
    expect(r.pediatricCount).toBe(1);
  });
});

describe("buildMusePharmacistV5Report", () => {
  it("2药师平均相互作用1.5", () => {
    const r = buildMusePharmacistV5Report([{ interactionCount: 1 }, { interactionCount: 2 }]);
    expect(r.avgInteractionPerPharm).toBe(1.5);
  });
});

describe("musePharmacistV5Routes 写权限", () => {
  it("POST /api/v1/muse-pharmacist/review 路由存在且 auth:true", () => {
    const post = musePharmacistV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/muse-pharmacist/review");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
