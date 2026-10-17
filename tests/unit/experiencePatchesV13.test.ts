/**
 * 健澜科技 jlmedaios - 修改点归因与经验补丁 V13 单测（M301-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  applyPatchV13,
  attributeModificationV13,
  generateExperiencePatchV13,
  type FeedbackModV13,
} from "../../src/bff/aggregators/experiencePatchesV13Aggregator";
import { experiencePatchesV13Routes } from "../../src/bff/routes/experiencePatchesV13";

const feedbacks: FeedbackModV13[] = [
  { feedbackId: "f-1", suggestionId: "s-1", modificationNote: "剂量过大" },
  { feedbackId: "f-2", suggestionId: "s-2", modificationNote: "时机推后" },
  { feedbackId: "f-3", suggestionId: "s-3", modificationNote: "不符合本院" },
];

describe("attributeModificationV13", () => {
  it("剂量 → dose", () => {
    expect(attributeModificationV13(feedbacks[0]).clause).toBe("dose");
  });
  it("时机推后 → timing", () => {
    expect(attributeModificationV13(feedbacks[1]).clause).toBe("timing");
  });
  it("不符合本院 → contraindication", () => {
    expect(attributeModificationV13(feedbacks[2]).clause).toBe("contraindication");
  });
});

describe("generateExperiencePatchV13", () => {
  it("3类归因 → 3条补丁", () => {
    const patches = generateExperiencePatchV13(feedbacks.map(attributeModificationV13));
    expect(patches.length).toBe(3);
  });
  it("空态 → 0", () => {
    expect(generateExperiencePatchV13([]).length).toBe(0);
  });
});

describe("applyPatchV13", () => {
  it("version 1 → 2，content 追加补丁建议", () => {
    const patches = generateExperiencePatchV13(feedbacks.map(attributeModificationV13));
    const newExp = applyPatchV13(
      { experienceId: "e-1", version: 1, content: "原内容" },
      patches[0],
    );
    expect(newExp.version).toBe(2);
    expect(newExp.content).toContain("原内容");
  });
});

describe("experiencePatchesV13Routes 写路由", () => {
  it("POST /api/v1/experience-patches/:id/apply 路由存在且 auth:true", () => {
    const route = experiencePatchesV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/experience-patches/:id/apply",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
