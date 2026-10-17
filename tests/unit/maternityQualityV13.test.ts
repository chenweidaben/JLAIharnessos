/**
 * 健澜科技 jlmedaios - 产科质量 V13 单测（M349-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCesareanRateV13,
  computeEpisiotomyRateV13,
  computePostpartumHemorrhageRateV13,
  type MaternityQualityRecordV13,
} from "../../src/bff/aggregators/maternityQualityV13Aggregator";
import { maternityQualityV13Routes } from "../../src/bff/routes/maternityQualityV13";

const records: MaternityQualityRecordV13[] = [
  { cesareanCount: 15, totalDeliveryCount: 50, episiotomyCount: 10, vaginalDeliveryCount: 35, postpartumHemorrhageCount: 2 },
  { cesareanCount: 15, totalDeliveryCount: 50, episiotomyCount: 10, vaginalDeliveryCount: 35, postpartumHemorrhageCount: 3 },
];

describe("computeCesareanRateV13", () => {
  // 算式：(15+15)/(50+50) = 30/100×100 = 30.00
  it("剖宫产率 = 30.00%", () => {
    expect(computeCesareanRateV13(records)).toBe(30.00);
  });
  it("空态 → 0", () => {
    expect(computeCesareanRateV13([])).toBe(0);
  });
});

describe("computeEpisiotomyRateV13", () => {
  // 算式：(10+10)/(35+35) = 20/70×100 = 28.57
  it("会阴侧切率 = 28.57%", () => {
    expect(computeEpisiotomyRateV13(records)).toBe(28.57);
  });
});

describe("computePostpartumHemorrhageRateV13", () => {
  // 算式：(2+3)/(50+50) = 5/100×100 = 5.00
  it("产后出血率 = 5.00%", () => {
    expect(computePostpartumHemorrhageRateV13(records)).toBe(5.00);
  });
});

describe("maternityQualityV13Routes 读路由", () => {
  it("GET /api/v1/maternity-quality 路由存在且 auth:true", () => {
    const route = maternityQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/maternity-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
