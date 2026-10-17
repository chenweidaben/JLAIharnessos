/**
 * 健澜科技 jlmedaios - 护理交班质量 V13 单测（M315-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSbarCompletenessV13,
  gradeHandoverQualityV13,
  identifyHandoverOmissionsV13,
  type NursingHandoverV13,
} from "../../src/bff/aggregators/nursingHandoverV13Aggregator";
import { nursingHandoverV13Routes } from "../../src/bff/routes/nursingHandoverV13";

const handover: NursingHandoverV13 = {
  patientId: "p1",
  s: "床号 12",
  b: "急性心肌梗死",
  a: "心电监护中",
  r: "",
  pressureUlcerHandedOver: true,
  fallHandedOver: false,
  vteHandedOver: true,
};

describe("computeSbarCompletenessV13", () => {
  // 算式：S/B/A/R 4 要素，s/b/a 已填（3），r 空（1）
  // completeness = 3/4×100 = 75
  it("completeness = 75", () => {
    expect(computeSbarCompletenessV13(handover)).toBe(75);
  });
  it("空态 → 0", () => {
    const empty: NursingHandoverV13 = {
      patientId: "p2",
      s: "",
      b: "",
      a: "",
      r: "",
      pressureUlcerHandedOver: false,
      fallHandedOver: false,
      vteHandedOver: false,
    };
    expect(computeSbarCompletenessV13(empty)).toBe(0);
  });
});

describe("identifyHandoverOmissionsV13", () => {
  // 算式：pressureUlcer=true, fall=false, vte=true → 遗漏 = ["跌倒"]
  it("遗漏 = [跌倒]", () => {
    expect(identifyHandoverOmissionsV13(handover)).toEqual(["跌倒"]);
  });
});

describe("gradeHandoverQualityV13", () => {
  // 算式：75 在 70-90 → 良
  it("75 → 良", () => {
    expect(gradeHandoverQualityV13(75)).toBe("良");
  });
  // 算式：95 ≥ 90 → 优
  it("95 → 优", () => {
    expect(gradeHandoverQualityV13(95)).toBe("优");
  });
  // 算式：60 < 70 → 待改进
  it("60 → 待改进", () => {
    expect(gradeHandoverQualityV13(60)).toBe("待改进");
  });
});

describe("nursingHandoverV13Routes 读路由", () => {
  it("GET /api/v1/nursing-handover 路由存在且 auth:true", () => {
    const route = nursingHandoverV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-handover",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
