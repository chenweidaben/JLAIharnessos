/**
 * 健澜科技 jlmedaios - 经验推送频控与免打扰 V13 单测（M295-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDigestPushV13,
  shouldNotifyV13,
  throttlePushV13,
  type ExperiencePushV13,
} from "../../src/bff/aggregators/experiencePushV13Aggregator";
import { experiencePushV13Routes } from "../../src/bff/routes/experiencePushV13";

const candidates: ExperiencePushV13[] = [
  { experienceId: "e-1", title: "房颤", category: "cardio", score: 82 },
  { experienceId: "e-2", title: "低体温", category: "postop", score: 46 },
  { experienceId: "e-3", title: "相互作用", category: "interaction", score: 86 },
  { experienceId: "e-4", title: "压疮", category: "nursing", score: 75 },
  { experienceId: "e-5", title: "剂量", category: "dose", score: 70 },
  { experienceId: "e-6", title: "VTE", category: "prevention", score: 65 },
  { experienceId: "e-7", title: "血糖", category: "nursing", score: 60 },
];

describe("throttlePushV13", () => {
  it("7条按score降序，top=5(e-3,e-1,e-4,e-5,e-6)，folded=2(e-7,e-2)", () => {
    const r = throttlePushV13(candidates, "nurse", 5);
    expect(r.top.length).toBe(5);
    expect(r.top[0].experienceId).toBe("e-3");
    expect(r.folded.length).toBe(2);
  });
  it("空态→top0/folded0/摘要空", () => {
    const r = throttlePushV13([], "nurse", 5);
    expect(r.top.length).toBe(0);
    expect(r.folded.length).toBe(0);
    expect(r.digestText).toBe("");
  });
});

describe("buildDigestPushV13", () => {
  it("2条折叠 → '还有 2 条相关经验未推送'", () => {
    const r = throttlePushV13(candidates, "nurse", 5);
    expect(r.digestText).toBe("还有 2 条相关经验未推送");
  });
});

describe("shouldNotifyV13", () => {
  it("mutedCategories=['nursing'] → e-4(nursing) false, e-1(cardio) true", () => {
    const prefs = { mutedCategories: ["nursing"] };
    expect(shouldNotifyV13(candidates[3], prefs)).toBe(false);
    expect(shouldNotifyV13(candidates[0], prefs)).toBe(true);
  });
});

describe("experiencePushV13Routes 读路由", () => {
  it("GET /api/v1/experience-push 路由存在且 auth:true", () => {
    const route = experiencePushV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/experience-push",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
