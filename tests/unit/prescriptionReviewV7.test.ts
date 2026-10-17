/**
 * 健澜科技 jlmedaios - 处方点评与药师反馈 V7 单测（M289-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRationalRateV7,
  rankDeptV7,
  reviewPrescriptionV7,
  type DrugUsage,
} from "../../src/bff/aggregators/prescriptionReviewV7Aggregator";
import { prescriptionReviewV7Routes } from "../../src/bff/routes/prescriptionReviewV7";

describe("reviewPrescriptionV7", () => {
  it("cdsPass=true→合理", () => {
    const r = reviewPrescriptionV7({ pass: true, criticalCount: 0, warningCount: 0 }, "张药师", "ok");
    expect(r.result).toBe("合理");
  });
  it("cdsPass=false→不合理", () => {
    const r = reviewPrescriptionV7({ pass: false, criticalCount: 1, warningCount: 0 }, "李药师", "有 critical");
    expect(r.result).toBe("不合理");
  });
});

describe("computeRationalRateV7", () => {
  it("333/400=83.25→83.3%", () => {
    const samples: DrugUsage[] = [
      { drugCode: "a", dept: "d1", rational: 95, sampleCnt: 100 },
      { drugCode: "b", dept: "d1", rational: 88, sampleCnt: 100 },
      { drugCode: "c", dept: "d2", rational: 70, sampleCnt: 100 },
      { drugCode: "d", dept: "d3", rational: 80, sampleCnt: 100 },
    ];
    expect(computeRationalRateV7(samples)).toBe(83.3);
  });
});

describe("rankDeptV7", () => {
  it("心内科183/200=91.5%第1", () => {
    const usages: DrugUsage[] = [
      { drugCode: "a", dept: "心内科", rational: 95, sampleCnt: 100 },
      { drugCode: "b", dept: "心内科", rational: 88, sampleCnt: 100 },
      { drugCode: "c", dept: "儿科", rational: 70, sampleCnt: 100 },
    ];
    const r = rankDeptV7(usages);
    expect(r[0].dept).toBe("心内科");
    expect(r[0].rationalRate).toBe(91.5);
    expect(r[0].rank).toBe(1);
  });
});

describe("prescriptionReviewV7Routes 写权限", () => {
  it("POST /api/v1/review/submit 路由存在且 auth:true", () => {
    const post = prescriptionReviewV7Routes.find((r) => r.method === "POST" && r.path === "/api/v1/review/submit");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
